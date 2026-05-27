class UpstreamError(Exception):
    """Raised when an external API is unavailable or returns an unusable response."""

    def __init__(self, source: str, message: str) -> None:
        super().__init__(f"{source}: {message}")
        self.source = source
        self.message = message
