# Storytel Provider for Audiobookshelf

A metadata provider that fetches book information from Storytel's API.

## Features

- High-resolution cover images (640x640)
- Smart title and series handling

## Installation

### Using Docker (recommended)

1.  **Create a `docker-compose.yml` file:** Create a `docker-compose.yml` file in your desired directory with the following content:

    ```yaml
    version: "3.8"
    services:
      storytel-provider:
        image: ghcr.io/revisor01/storytel-provider:latest
        container_name: storytel-provider
        restart: unless-stopped
        environment:
          - STORYTEL_LOCALE=de  # Set the desired locale (e.g., de, en, es)
        networks:
          - abs_network
        security_opt:
          - no-new-privileges:true

    networks:
      abs_network:
        external: true # Or create a network if needed
    ```

2.  **Important: Set the Locale Environment Variable:**

    *   The `STORYTEL_LOCALE` environment variable in the `docker-compose.yml` file determines the language used for searching and fetching metadata from Storytel.
    *   **Change `STORYTEL_LOCALE=de`** to your preferred language (e.g., `STORYTEL_LOCALE=en` for English).

3.  **Run Docker Compose:**
    ```bash
    docker-compose up -d
    ```

    This command will pull the image, create the container, and start it in detached mode.

4.  **Ensure Network Connectivity:**

    *   Make sure the `abs_network` exists and your Audiobookshelf instance is also connected to this network.
    *   If `abs_network` doesn't exist, create it with `docker network create abs_network`.

## Configuration in Audiobookshelf

1.  Go to Settings -> Metadata in Audiobookshelf.
2.  Add Custom Provider.
3.  URL: `http://storytel-provider:3000`

## Language Configuration

The provider uses a single locale setting defined by the `STORYTEL_LOCALE` environment variable.  To change the search language:

1.  Modify the `STORYTEL_LOCALE` environment variable in the `docker-compose.yml` file.
2.  Run `docker-compose up -d` again to apply the changes.

## Metadata Processing

### Title Handling

- Removes format indicators (Ungekürzt/Gekürzt)
- Cleans series information from titles
- Extracts subtitles
- Handles various series formats:
    - "Title, Folge X"
    - "Title, Band X"
    - "Title - Teil X"
    - "Title, Volume X"

### Series Information

- Formats series information as "Series Name, Number"
- Maintains clean titles without series markers

## Known Limitations

- Title cleanup patterns are optimized for German titles and may not work perfectly for all languages.
- Search results depend on Storytel API availability.
- Some metadata fields might be unavailable depending on the book.

## Security

- The `security_opt: [no-new-privileges:true]` setting in the `docker-compose.yml` file enhances container security by preventing the container from gaining new privileges.

## License

MIT License