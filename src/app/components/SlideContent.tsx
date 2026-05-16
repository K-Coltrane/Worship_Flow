type SlidePayload = {
  mediaUrl?: string;
  type?: string;
};

export function SlideContent({
  slide,
  className = '',
}: {
  slide: { type?: string; title?: string; content?: string; payload?: SlidePayload };
  className?: string;
}) {
  const mediaUrl = slide.payload?.mediaUrl;
  const mediaType = slide.payload?.type ?? slide.type;

  if (slide.type === 'media' && mediaUrl) {
    if (mediaType === 'image') {
      return (
        <img
          src={mediaUrl}
          alt={slide.title ?? 'Media'}
          className={`max-h-full max-w-full object-contain rounded-lg shadow-lg ${className}`}
        />
      );
    }
    if (mediaType === 'video') {
      return (
        <video
          src={mediaUrl}
          controls
          autoPlay
          muted
          loop
          className={`max-h-full max-w-full rounded-lg shadow-lg ${className}`}
        />
      );
    }
    if (mediaType === 'audio') {
      return (
        <div className={`text-center space-y-4 ${className}`}>
          <p className="text-2xl font-semibold text-foreground">{slide.title}</p>
          <audio src={mediaUrl} controls autoPlay className="w-full max-w-md mx-auto" />
        </div>
      );
    }
  }

  return (
    <div className={`text-center ${className}`}>
      <h2 className="text-4xl text-foreground font-bold mb-4">{slide.title}</h2>
      {slide.content && (
        <p className="text-2xl text-foreground/90 leading-relaxed whitespace-pre-line">
          {slide.content}
        </p>
      )}
    </div>
  );
}
