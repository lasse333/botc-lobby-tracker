const botcLobbiesLinks = [
    "https://botc.app/join/clockmakers",
];

async function startup() {
    let lobbies = [];

    for (const lobby of botcLobbiesLinks) {
        const botcLobby = new BOTCLobby(lobby);
        lobbies.push(botcLobby);
    }

    for (const lobby of lobbies) {
        lobby.fetchLobbyData().then(() => {
            console.log("Lobby URL:", lobby.url);
            console.log("Lobby name:", lobby.getLobbyName());
            console.log("Is game running:", lobby.isGameRunning());
            console.log("Game description:", lobby.getGameDescription());
            console.log("Script name:", lobby.getScriptName());
            console.log("Storytellers:", lobby.getStoryTellers());
            console.log("Players:", lobby.getPlayers());
            console.log("Open seats:", lobby.getOpenSeats());
            console.log("Phase:", lobby.getPhase());
            console.log("Is between games:", lobby.isBetweenGames());
            console.log("-----------------------------------------------")
        });
    }

}

class BOTCLobby {
    #lobbyHTML;
    #selfClosingTags;

    constructor(url) {
        this.url = url;
    }

    async fetchLobbyData() {
        const response = await fetch(this.url);
        const data = await response.text();
        this.#lobbyHTML = parseHTMLRecursively(data)[0]; // Get the root HTML node
        this.#selfClosingTags = new HTMLNode("html", {}, getSelfClosingTags(data));
        
        console.log(this.#lobbyHTML);
        console.log(this.#selfClosingTags);
    }

    getLobbyName() {
        let metaTag = this.#selfClosingTags.getChildByAttribute("property", "og:title");
        return metaTag.attributes.content.split("'", 2).slice(1)[0];
    }

    getOpenSeats() {
        if (!this.isGameRunning()) return 0;
        let metaTag = this.#selfClosingTags.getChildByAttribute("property", "og:title");
        let regex = /\((\S+)\s.+/g;
        let match = regex.exec(metaTag.attributes.content);
        return match ? parseInt(match[1]) : 0;
    }

    getScriptName() {
        if (!this.isGameRunning()) return "No script";
        let description = this.getGameDescription();
        let regex = /Edition:\s(.+)/g;
        let match = regex.exec(description);
        return match ? match[1] : "No script";
    }

    getPhase() {
        if (!this.isGameRunning()) return "No phase";
        let description = this.getGameDescription();
        let regex = /Phase:\s(.+)/g;
        let match = regex.exec(description);
        return match ? match[1] : "Game not running";
    }

    isGameRunning() {

        return this.#lobbyHTML.getChildByTagName("body").content.length > 1;

    }

    isBetweenGames() {
        if (!this.isGameRunning()) return false;
        return this.getPhase().startsWith("⌛")
    }

    getGameDescription() {
        
        if (!this.isGameRunning()) return "Game not running";

        return this.#selfClosingTags.getChildByAttribute("property", "og:description").attributes.content;

    }

    getStoryTellers() {
        if (!this.isGameRunning()) return [];

        const storyTellers = [];
        const storyTellerListNode = this.#lobbyHTML.getChildByTagName("body").getChildByAttribute("class", "storytellers");

        if (!storyTellerListNode.content) return [];

        storyTellerListNode.content.forEach(storyTellerNode => {
            const storyTellerName = storyTellerNode.content;
            storyTellers.push(storyTellerName);
        });
        return storyTellers;
    }

    getPlayers() {
        if (!this.isGameRunning()) return [];

        const players = [];
        this.#lobbyHTML.getChildByTagName("body").getChildByAttribute("class", "players").content.forEach(playerNode => {
            const playerName = playerNode.content;
            players.push(new BOTCPlayer(playerName));
        });
        return players;
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

startup();