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
            console.log("Is game running:", lobby.isGameRunning());
            console.log("Game description:", lobby.getGameDescription());
            console.log("Players:", lobby.getPlayers());
        });
    }

}

function isGameRunning(parsedHTML) {

    return parsedHTML.getChildByTagName("body").content.length > 1;

}

function getGameDescription(parsedHTML) {

    return parsedHTML.getChildByAttribute("property", "og:description").attributes.content;

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
        
    }

    isGameRunning() {

        return this.#lobbyHTML.getChildByTagName("body").content.length > 1;

    }

    getGameDescription() {
        
        if (!this.isGameRunning()) return "Game not running";

        return this.#selfClosingTags.getChildByAttribute("property", "og:description").attributes.content;

    }

    getStoryTellers() {
        if (!this.isGameRunning()) return [];

        const storyTellers = [];
        this.#lobbyHTML.getChildByTagName("body").getChildByAttribute("class", "storytellers").content.forEach(storyTellerNode => {
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
            players.push(playerName);
        });
        return players;
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