// Retry block shown instead of blank content when a fetch fails.
export default function LoadError({
  message = "Could not load content.",
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center px-6">
      <p className="text-gray-500 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-semibold text-[#b33b62] hover:text-[#8e2c4d] transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
