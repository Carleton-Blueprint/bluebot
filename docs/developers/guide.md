!!!tip "Welcome, Player One!"
    Looking to contribute to the **Bluebot** project? This guide will help you get started.
    
## Core concepts

💻 [**Separation of concerns (sometimes abbreviated as SoC)**](https://en.wikipedia.org/wiki/Separation_of_concerns)

:   If you're a new developer to this project, there are a few core concepts you should understand before you start contributing. Fortunately, Bluebot is built in such a way that you can start contributing **without** needing to understand everything at once.

1️⃣ [**Single source of truth**](https://en.wikipedia.org/wiki/Single_source_of_truth)

:   This project is built with the idea that there should be a single source of truth for all data. In this case, because Bluebot **does not** maintain its own database, the single source of truth is the [GitHub API](https://docs.github.com/en/rest).

🔎 [**Statelessness**](https://en.wikipedia.org/wiki/Service_statelessness_principle)

:   Bluebot is designed to be stateless, meaning that each request is independent and doesn't rely on previous requests. This has several benefits, including:

:   **Self-Contained Requests**: Each request includes all the data needed for processing, so the service doesn’t need to remember previous interactions.

:   **Scalability**: Stateless services can be scaled more easily since any instance of the service can handle any request independently.

:   **Resilience**: If a service instance goes down, it doesn't affect the state of other instances, making the system more resilient.

:   **Simpler Design**: Without the need to manage state, the architecture can be simpler and easier to maintain.

## Tech Stack

To get started, here are the different technologies that are used extensively in this project, and their purpose:

{{ read_csv('parts.csv') }}


=== "Tab 1"

    hey

=== "Tab 2"

    ho

!!!note "hey"
    sup


- Prettier and ESLint checks

- src directory structure
