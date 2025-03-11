const validDomains = [
  "steamcommunity.com",
  "steampowered.com",
  "store.steampowered.com",
  "discord.com",
  "discord.gg",
  "discordapp.com",
  "cdn.discordapp.com",
  "media.discordapp.net",
  "github.com",
  "youtube.com",
  "youtu.be",
];

async function validateUrl(url) {
  try {
    // Add protocol if missing
    const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;

    // Validate URL format
    const urlPattern = new RegExp(
      "^(https?:\\/\\/)" + // protocol
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
        "\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})" + // OR ip (v4) address
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
        "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
        "(\\#[-a-z\\d_]*)?$", // fragment locator
      "i"
    );

    if (!urlPattern.test(urlWithProtocol)) {
      return false;
    }

    // Parse URL and get domain
    const parsedUrl = new URL(urlWithProtocol);
    const domain = parsedUrl.hostname.toLowerCase();

    // Remove 'www.' if present
    const cleanDomain = domain.replace(/^www\./, "");

    // Check if domain is in allowed list
    return validDomains.includes(cleanDomain);
  } catch (error) {
    console.error("URL validation error:", error);
    return false;
  }
}

module.exports = validateUrl;
