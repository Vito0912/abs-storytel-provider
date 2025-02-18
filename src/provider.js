const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({
    stdTTL: 600
});

class StorytelProvider {
    constructor() {
        this.baseSearchUrl = 'https://www.storytel.com/api/search.action';
        this.baseBookUrl = 'https://www.storytel.com/api/getBookInfoForContent.action';
        this.defaultLocale = process.env.STORYTEL_LOCALE || 'de';
    }

    ensureString(value) {
        if (value === null || value === undefined) return '';
        return String(value).trim();
    }

    upgradeCoverUrl(url) {
        if (!url) return undefined;
        return `https://storytel.com${url.replace('320x320', '640x640')}`;
    }

    cleanTitle(title, seriesName) {
        if (!title) return '';

        let cleanedTitle = title;
        const patterns = [
            /^.*?,\s*Folge\s*\d+:\s*/i,
            /^.*?,\s*Band\s*\d+:\s*/i,
            /^.*?\s+-\s+\d+:\s*/i,
            /^.*?\s+\d+:\s*/i,
            /^.*?,\s*Teil\s*\d+:\s*/i,
            /^.*?,\s*Volume\s*\d+:\s*/i,
            /\s*\((Ungekürzt|Gekürzt)\)\s*$/i,
            /,\s*Teil\s+\d+$/i,
            /-\s*.*?(?:Reihe|Serie)\s+\d+$/i
        ];

        for (const pattern of patterns) {
            cleanedTitle = cleanedTitle.replace(pattern, '');
        }

        if (seriesName) {
            const seriesPattern = new RegExp(`^${seriesName}[\\s,-]*\\d*:?\\s*`, 'i');
            cleanedTitle = cleanedTitle.replace(seriesPattern, '');
        }

        return cleanedTitle.trim();
    }

    // Helper function to clean age categories
    cleanCategories(categories) {
        if (!categories || !Array.isArray(categories)) return [];
        return categories.filter(cat => !cat.match(/\d+\s*(bis|-)\s*\d+\s*(Jahre|Year|Age)/i));
    }

    splitGenre(genre) {
        const splits = {
            'Fantasy/Sci-Fi': ['Fantasy', 'Science-Fiction'],
            'Fantasy/Science-Fiction': ['Fantasy', 'Science-Fiction'],
            'Sci-Fi/Fantasy': ['Science-Fiction', 'Fantasy'],
            'Poesie/Lyrik': ['Poesie', 'Lyrik']
            // Weitere Kombinationen können hier hinzugefügt werden
        };
        return splits[genre] || [genre];
    }

    formatBookMetadata(bookData) {
        const slb = bookData.slb;
        if (!slb || !slb.book) return null;

        const book = slb.book;
        const abook = slb.abook;
        const ebook = slb.ebook;

        if (!abook && !ebook) return null;

        // Series Info
        let seriesInfo = null;
        let seriesName = null;
        if (book.series && book.series.length > 0 && book.seriesOrder) {
            seriesName = book.series[0].name;
            seriesInfo = [{
                series: this.ensureString(seriesName),
                sequence: this.ensureString(book.seriesOrder)
            }];
        }

        // Autor-Handling
        const author = this.ensureString(book.authorsAsString);

        // Title und Subtitle handling
        let title = book.name;
        let subtitle = null;

        // Patterns für Titel-Bereinigung
        const cleanupPatterns = {
            prefixPatterns: [  // Patterns die am Anfang matchen (^)
                /^.*?,\s*Folge\s*\d+:\s*/i,
                /^.*?,\s*Band\s*\d+:\s*/i,
                /^.*?\s+-\s+\d+:\s*/i,
                /^.*?\s+\d+:\s*/i,
                /^.*?,\s*Teil\s*\d+:\s*/i,
                /^.*?,\s*Volume\s*\d+:\s*/i
            ],
            suffixPatterns: [  // Patterns die am Ende matchen ($)
                /\s*\((Ungekürzt|Gekürzt)\)\s*$/i,
                /,\s*Teil\s+\d+$/i,
                /-\s*.*?(?:Reihe|Serie)\s+\d+$/i
            ]
        };

        // Bereinige den Titel
        cleanupPatterns.prefixPatterns.forEach(pattern => {
            title = title.replace(pattern, '');
        });
        cleanupPatterns.suffixPatterns.forEach(pattern => {
            title = title.replace(pattern, '');
        });

        // Wenn es eine Serie ist
        if (seriesInfo) {
            subtitle = `${seriesName}, ${book.seriesOrder}`;

            // Wenn der Serientitel im Haupttitel vorkommt
            if (title.includes(seriesName)) {
                // Nimm alles bis zum Serientitel (inklusive Trenner wie "-" oder ",")
                const beforeSeriesMatch = title.match(new RegExp(`^(.+?)[-,]\\s*${seriesName}`));
                if (beforeSeriesMatch) {
                    title = beforeSeriesMatch[1].trim();
                }
            }

            // Bereinige nochmal eventuell verbliebene Serienbezeichnungen
            cleanupPatterns.prefixPatterns.forEach(pattern => {
                title = title.replace(pattern, '');
            });
            cleanupPatterns.suffixPatterns.forEach(pattern => {
                title = title.replace(pattern, '');
            });
        }
        // Wenn kein Serie aber ein Untertitel vorhanden
        else if (title.includes(':')) {
            const parts = title.split(':');
            title = parts[0].trim();
            subtitle = parts[1].trim();
        }

        // Finaler Trim
        title = title.trim();
        if (subtitle) {
            subtitle = subtitle.trim();
        }

        // Genres sind Hauptkategorien
        const genres = book.category
            ? this.splitGenre(this.ensureString(book.category.title))
            : [];

        // Tags sind die gleichen wie Genres
        const tags = [...genres];

        // Erstelle das Metadata-Objekt
        const metadata = {
            title: this.ensureString(title),
            subtitle: subtitle,
            author: author,
            language: this.ensureString(book.language?.isoValue || 'de'),
            genres: genres.length > 0 ? genres : undefined,
            tags: tags.length > 0 ? tags : undefined,
            series: seriesInfo,
            cover: this.upgradeCoverUrl(book.largeCover)
        };

        // Audio-spezifische Metadaten
        if (abook) {
            metadata.duration = abook.length ? Math.floor(abook.length / 60000) : undefined; // ms zu Minuten
            metadata.narrator = abook.narratorAsString || undefined;
            metadata.description = this.ensureString(abook.description);
            metadata.publisher = this.ensureString(abook.publisher?.name);
            metadata.publishedYear = abook.releaseDateFormat?.substring(0, 4);
            metadata.isbn = this.ensureString(abook.isbn);
        }
        // eBook-spezifische Metadaten
        else if (ebook) {
            metadata.description = this.ensureString(ebook.description);
            metadata.publisher = this.ensureString(ebook.publisher?.name);
            metadata.publishedYear = ebook.releaseDateFormat?.substring(0, 4);
            metadata.isbn = this.ensureString(ebook.isbn);
        }

        // Entferne undefined Werte
        Object.keys(metadata).forEach(key =>
            metadata[key] === undefined && delete metadata[key]
        );

        return metadata;
    }

    async searchBooks(query, author = '') {
        // Bereinige die Suche von Untertiteln
        const cleanQuery = query.split(':')[0].trim();

        const formattedQuery = cleanQuery.replace(/\s+/g, '+');
        const locale = this.defaultLocale; // Verwende das Locale aus der Umgebungsvariable

        const cacheKey = `${formattedQuery}-${author}-${locale}`;

        console.log(`Original query: "${query}"`);
        console.log(`Cleaned query: "${cleanQuery}"`);

        const cachedResult = cache.get(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        try {
            console.log(`Searching for: "${cleanQuery}" by "${author}" in locale: ${locale}`);

            const searchResponse = await axios.get(this.baseSearchUrl, {
                params: {
                    request_locale: locale,
                    q: formattedQuery
                },
                headers: {
                    'User-Agent': 'Storytel'
                }
            });

            if (!searchResponse.data || !searchResponse.data.books) {
                console.log('No books found');
                return { matches: [] };
            }

            const books = searchResponse.data.books;
            console.log(`Found ${books.length} books in search results`);

            const matches = await Promise.all(books.map(async book => {
                if (!book.book || !book.book.id) return null;
                const bookDetails = await this.getBookDetails(book.book.id, locale);
                if (!bookDetails) return null;

                return this.formatBookMetadata(bookDetails);
            }));

            const validMatches = matches.filter(match => match !== null);
            console.log(`Processed ${validMatches.length} valid matches`);

            const result = { matches: validMatches };
            cache.set(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Error searching books:', error.message);
            return { matches: [] };
        }
    }

    async getBookDetails(bookId, locale) {
        try {
            const response = await axios.get(this.baseBookUrl, {
                params: {
                    bookId: bookId,
                    request_locale: locale
                },
                headers: {
                    'User-Agent': 'Storytel'
                }
            });

            return response.data;
        } catch (error) {
            console.error(`Error fetching book details for ID ${bookId}:`, error.message);
            return null;
        }
    }
}

module.exports = StorytelProvider;