# Storytel Provider for Audiobookshelf

A metadata provider that fetches book information from Storytel's API.

> [!NOTE]
> This is a fork and provides an instance that works with more languages and fixes some bugs.

## Installation

### Using Docker (recommended)

1. **Create a `docker-compose.yml` file:** Create a `docker-compose.yml` file in your desired directory with the following content:

    ```yaml
    version: "3.8"
    services:
      storytel-provider:
        image: ghcr.io/vito0912/storytel-provider:latest
        container_name: storytel-provider
        restart: unless-stopped
        networks:
          - abs_network
        security_opt:
          - no-new-privileges:true

    networks:
      abs_network:
        external: true
    ```

2. **Run Docker Compose:**
    ```bash
    docker-compose up -d
    ```

    This command will pull the image, create the container, and start it in detached mode.

## Configuration in Audiobookshelf

1.  Go to Settings -> Metadata in Audiobookshelf.
2.  Add Custom Provider.
3.  URL: `http://storytel-provider:3000/<lang-code>` (e.g. `http://storytel-provider:3000/de/`)

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

# Supported Regions

| Language      | Country Code |
|---------------|--------------|
| arabic        | ae           |
| bulgarian     | bg           |
| english       | en           |
| english       | us           |
| spanish       | es           |
| finnish       | fi           |
| french        | fr           |
| germany       | de           |
| indonesian    | id           |
| icelandic     | is           |
| italian       | it           |
| korean        | kr           |
| dutch         | nl           |
| norwegian     | no           |
| polish        | pl           |
| portuguese    | pt           |
| swedish       | se           |
| thai          | th           |
| turkish       | tr           |
| hebrew        | il           |
| danish        | dk           |

## License

MIT License (Set by Revisor01.  No license file was provided in the repository)
