const botcLobbiesLinks = [
    "https://botc.app/join/clockmakers",
];

const discordWebhookURL = "";

let lobbies = [];

async function startup() {

    for (const lobby of botcLobbiesLinks) {
        const botcLobby = new BOTCLobby(lobby);
        lobbies.push(botcLobby);
    }


    setInterval(update, 1000 * 60); // Keep the script running
    update(); // Initial update
}

async function update() {

    for (const lobby of lobbies) {
        lobby.updateDiscordMessage();
        // lobby.fetchLobbyData().then(() => {
        //     console.log("Lobby URL:", lobby.url);
        //     console.log("Lobby name:", lobby.getLobbyName());
        //     console.log("Is lobby open:", lobby.isLobbyOpen());
        //     console.log("Game description:", lobby.getGameDescription());
        //     console.log("Script name:", lobby.getScriptName());
        //     console.log("Storytellers:", lobby.getStoryTellers());
        //     console.log("Players:", lobby.getPlayers());
        //     console.log("Spectators:", lobby.getSpectators());
        //     console.log("Open seats:", lobby.getOpenSeats());
        //     console.log("Phase:", lobby.getPhase());
        //     console.log("Is between games:", lobby.isBetweenGames());
        //     console.log("Is day:", lobby.isDay());
        //     console.log("Is night:", lobby.isNight());
        //     console.log("-----------------------------------------------")
        // });
    }
}

class BOTCLobby {
    #lobbyHTML;
    #selfClosingTags;
    discordMessageID = null;

    constructor(url) {
        this.url = url;
    }

    async fetchLobbyData() {
        console.log(`Getting lobby data for: ${this.url}`);
        let response;
        try {
            response = await fetch(this.url);
        } catch (error) {
            console.error(`Failed to fetch lobby data for: ${this.url}`, error);
            throw error;
        }
        const data = await response.text();
        this.#lobbyHTML = parseHTMLRecursively(data)[0]; // Get the root HTML node
        this.#selfClosingTags = new HTMLNode("html", {}, getSelfClosingTags(data));
        
        // console.log(this.#lobbyHTML);
        // console.log(this.#selfClosingTags);
    }

    async updateDiscordMessage() {
        try {
            await this.fetchLobbyData();
        } catch (error) {
            return;
        }
        if (!this.isLobbyOpen()) {
            this.deleteDiscordMessage();
            return
        } 
        if (!this.discordMessageID) {
            await this.sendDiscordMessage();
        }

        console.log(`Updating Discord message for lobby: ${this.url}`);

        const response = await fetch(discordWebhookURL + "/messages/" + this.discordMessageID + "?with_components=true", {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.isBetweenGames() ? this.discordMessageWaitingForPlayers() : this.discordMessageGameRunning())
        })

        return response;

    }

    async sendDiscordMessage() {
        console.log(`Sending Discord message for lobby: ${this.url}`);
        const response = await fetch(discordWebhookURL + "?wait=true", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: `Nu åbner rummet "${this.getLobbyName()}"`
            })
        })
        const data = await response.json();
        this.discordMessageID = data.id;

        console.log(`Sent Discord message with ID: ${this.discordMessageID}`);
    }

    async deleteDiscordMessage() {
        if (!this.discordMessageID) return;
        console.log(`Deleting Discord message for lobby: ${this.url}`);
        
        fetch(`${discordWebhookURL}/messages/${this.discordMessageID}`, {
            method: 'DELETE'
        });
        this.discordMessageID = null;
    }

    discordMessageGameRunning() {
        let color = 0x0; // Default color
        if (this.isDay()) color = 0xffc700; // Yellow for day
        if (this.isNight()) color = 0x6319ff; // Purple for night
        return {
            "content": " ",
            "embeds": [
                {
                    "title": this.getLobbyName(),
                    "type": "rich",
                    "color": color,
                    "fields": [
                        {
                            "name": "Storytellers",
                            "value": this.getStoryTellers().map(name => `* ${name}`).join("\n") || "Ingen",
                        },
                        {
                            "name": "Spillere",
                            "value": this.getPlayers().length,
                            "inline": true
                        },
                        {
                            "name": "I live",
                            "value": this.getPlayers().filter(player => player.isAlive).length,
                            "inline": true
                        },
                        {
                            "name": "Døde",
                            "value": this.getPlayers().filter(player => player.isDead).length,
                            "inline": true
                        },
                        {
                            "name": "Script",
                            "value": this.getScriptName()
                        },
                        {
                            "name": "Fase",
                            "value": this.getPhase(),
                            "inline": true
                        },
                        {
                            "name": " ",
                            "value": " ",
                            "inline": true
                        },
                        {
                            "name": "Tilskuere",
                            "value": this.getSpectators().length,
                            "inline": true
                        }
                    ]
                }
            ],
            "components": [
                {
                    "type": 1,
                    "components": [
                        {
                            "type": 2,
                            "style": 5,
                            "label": "Deltag",
                            "url": this.url,
                        }
                    ]
                }
            ]
        };
    }

    discordMessageWaitingForPlayers() {
        let color = 0x4b88ff; // Blue for between games
        return {
            "content": " ",
            "embeds": [
                {
                    "title": this.getLobbyName(),
                    "type": "rich",
                    "color": color,
                    "fields": [
                        {
                            "name": "Storytellers",
                            "value": this.getStoryTellers().map(name => `* ${name}`).join("\n") || "Ingen",
                        },
                        {
                            "name": "Spillere",
                            "value": this.getAmountOfPlayersInLobby(),
                            "inline": true
                        },
                        {
                            "name": " ",
                            "value": " ",
                            "inline": true
                        },
                        {
                            "name": "Åbne pladser",
                            "value": this.getOpenSeats(),
                            "inline": true
                        },
                        {
                            "name": "Script",
                            "value": this.getScriptName()
                        },
                        {
                            "name": "Fase",
                            "value": this.getPhase(),
                            "inline": true
                        },
                        {
                            "name": " ",
                            "value": " ",
                            "inline": true
                        },
                        {
                            "name": "Tilskuere",
                            "value": this.getSpectators().length,
                            "inline": true
                        }
                    ]
                }
            ],
            "components": [
                {
                    "type": 1,
                    "components": [
                        {
                            "type": 2,
                            "style": 5,
                            "label": "Deltag",
                            "url": this.url,
                        }
                    ]
                }
            ]
        };
    }

    getLobbyName() {
        let metaTag = this.#selfClosingTags.getChildByAttribute("property", "og:title");
        return metaTag.attributes.content.split("'").slice(1, -1).join("'");
    }

    getOpenSeats() {
        if (!this.isLobbyOpen()) return 0;
        
            return this.getAllSeats().length - this.getPlayers().length;
    }

    getScriptName() {
        if (!this.isLobbyOpen()) return "Lobby is closed";
        let description = this.getGameDescription();
        let regex = /Edition:\s(.+)/g;
        let match = regex.exec(description);
        match = match ? match[1] : "No script";

        match = match.replaceAll("&amp;", "&");
        return match;
    }

    getPhase() {
        if (!this.isLobbyOpen()) return "Lobby is closed";
        let description = this.getGameDescription();
        let regex = /Phase:\s(.+)/g;
        let match = regex.exec(description);
        return match ? match[1] : "Lobby is closed";
    }

    isDay() {
        if (!this.isLobbyOpen()) return false;
        return this.getPhase().toLowerCase().includes("day");
    }

    isNight() {
        if (!this.isLobbyOpen()) return false;
        return this.getPhase().toLowerCase().includes("night");
    }

    isLobbyOpen() {

        return this.#lobbyHTML.getChildByTagName("body").content.length > 1;

    }

    isBetweenGames() {
        if (!this.isLobbyOpen()) return false;
        return this.getPhase().startsWith("⌛")
    }

    getGameDescription() {
        
        if (!this.isLobbyOpen()) return "Lobby is closed";

        return this.#selfClosingTags.getChildByAttribute("property", "og:description").attributes.content;

    }

    getStoryTellers() {
        if (!this.isLobbyOpen()) return [];

        const storyTellers = [];
        const storyTellerListNode = this.#lobbyHTML.getChildByTagName("body").getChildByAttribute("class", "storytellers");

        if (!storyTellerListNode.content) return [];

        storyTellerListNode.content.forEach(storyTellerNode => {
            const storyTellerName = storyTellerNode.content;
            storyTellers.push(storyTellerName);
        });
        return storyTellers;
    }

    getAllSeats() {
        if (!this.isLobbyOpen()) return [];

        const players = [];
        this.#lobbyHTML.getChildByTagName("body").getChildByAttribute("class", "players").content.forEach(playerNode => {
            const playerName = playerNode.content;
            players.push(new BOTCPlayer(playerName));
        });
        return players;
    }

    getPlayers() {
        if (!this.isLobbyOpen()) return [];

        const players = [];
        this.#lobbyHTML.getChildByTagName("body").getChildByAttribute("class", "players").content.filter(playerNode => playerNode.attributes?.id).forEach(playerNode => {
            const playerName = playerNode.content;
            players.push(new BOTCPlayer(playerName));
        });
        return players;
    }

    getSpectators() {
        if (!this.isLobbyOpen()) return [];
        const spectators = [];
        let regex = /Spectator\(s\):\s(.+)/g
        let match = regex.exec(this.getGameDescription());
        if (!match) return [];
        match[1].split(", ").forEach(spectator => {
            spectators.push(spectator);
        });
        return spectators;
        
    }
}

class BOTCPlayer {
    #input
    #statusSymbol
    constructor(name) {
        this.#input = name;
        this.#statusSymbol = this.#input.split(" ", 1)[0];
        this.name = this.#input.split(" ").slice(1).join(" ");
    }

    get status() {
        switch (this.#statusSymbol) {
            case "🔘":
                return "dead";
                break;
            case "🔵":
                return "dead vote used";
                break;
            case "⚪":
                return "alive";
                break;
            default:
                return "unknown";
        }
    }

    get isAlive() {
        return this.status === "alive";
    }

    get isDead() {
        return this.status === "dead" || this.status === "dead vote used";
    }
    
}

class HTMLNode {
    constructor(tagName, attributes = {}, content = null) {
        this.tagName = tagName;
        this.attributes = attributes;
        this.content = content; // Can be string or array of HTMLNode
    }

    getChildByTagName(tagName) {
        if (!Array.isArray(this.content)) return null;
        return this.content.find(child => child.tagName === tagName) || null;
    }

    getChildByAttribute(attrName, attrValue) {
        if (!Array.isArray(this.content)) return null;
        return this.content.find(child => child.attributes[attrName] === attrValue) || null;
    }
}

function getSelfClosingTags(htmlString) {
    const selfClosingRegex = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)\s*\/>/g;
    const selfClosingElements = [];
    let match;

    while ((match = selfClosingRegex.exec(htmlString)) !== null) {
        const tagName = match[1];
        const attributes = parseAttributes(match[2].trim());

        selfClosingElements.push(new HTMLNode(tagName, attributes));
    }

    return selfClosingElements;
}

function parseHTMLRecursively(htmlString) {
    const regularTagRegex = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>([\s\S]*?)<\/\1>/g;
    const elements = [];
    let match;

    // Handle regular tags with content
    while ((match = regularTagRegex.exec(htmlString)) !== null) {
        const tagName = match[1];
        const attributes = parseAttributes(match[2].trim());
        const content = match[3].trim();

        // Recursively parse the content of the tag
        const children = parseHTMLRecursively(content);

        elements.push(new HTMLNode(
            tagName,
            attributes,
            children.length > 0 ? children : content
        ));
    }

    return elements;
}

function parseAttributes(attributeString) {
    const attributes = {};
    const regex = /([a-zA-Z][a-zA-Z0-9\-]*)\s*=\s*"([^"]*)"/g;
    let match;

    while ((match = regex.exec(attributeString)) !== null) {
        const key = match[1];
        const value = match[2];
        attributes[key] = value;
    }

    return attributes;
}

function dateToFootnote(date) {
    const footnote = date.toLocaleString("da-DK", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
    return footnote;
}

function discordEmbedMessage(url, name, color=0x0, fields) {
    return{
            "content": " ",
            "embeds": [
                {
                    "title": name,
                    "type": "rich",
                    "color": color,
                    "fields": fields,
                    "footer": {
                        "text": "Sidst opdateret: " + dateToFootnote(new Date())
                    }
                }
            ],
            "components": [
                {
                    "type": 1,
                    "components": [
                        {
                            "type": 2,
                            "style": 5,
                            "label": "Deltag",
                            "url": url,
                        }
                    ]
                }
            ]
        }
}

startup();