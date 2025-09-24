const botcLobbies = [
    "https://botc.app/join/clockmakers",
    "https://botc.app/join/puppy's%20playground",
    "https://botc.app/join/clockonmyblood",
];

async function startup() {

    for (const lobby of botcLobbies) {

        fetch(lobby)
        .then(response => response.text())
        .then(data => {
            console.log(
                parseHTMLRecursively(data),
                getSelfClosingTags(data)
            );
        })
    }

}

function getSelfClosingTags(htmlString) {
    const selfClosingRegex = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)\s*\/>/g;
    const selfClosingElements = [];
    let match;

    while ((match = selfClosingRegex.exec(htmlString)) !== null) {
        const tagName = match[1];
        const attributes = parseAttributes(match[2].trim());

        selfClosingElements.push({
            tagName,
            attributes,
            content: null
        });
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

        elements.push({
            tagName,
            attributes,
            content: children.length > 0 ? children : content
        });
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