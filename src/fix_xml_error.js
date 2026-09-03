(() => {
    // Prüft, ob das Dokument ein rohes XML-Fehlerdokument ist
    const isXmlError = 
        document.contentType.includes("xml") || 
        document.querySelector("Error > Code") !== null ||
        document.body?.innerText?.includes("<Error><Code>AccessDenied</Code>") ||
        document.body?.innerText?.includes("NoSuchKey");

    if (isXmlError) {
        console.warn("[OldTweetDeck] XML S3/CloudFront error detected. Redirecting to TweetDeck...");
        window.location.replace("https://x.com/i/tweetdeck");
    }
})();
