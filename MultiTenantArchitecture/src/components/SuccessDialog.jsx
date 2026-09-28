const SuccessDialog = ({ open, title, message, buttonText = "Continue", onContinue }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">

        {/* Success icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-7 w-7 text-green-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="mt-5 text-center">
          <h3 className="text-xl font-bold text-gray-900">
            {title}
          </h3>

          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            {message}
          </p>
        </div>

        {/* Button */}
        <button
          onClick={onContinue}
          className="
            mt-6
            h-11
            w-full
            rounded-lg
            bg-[#611f69]
            font-semibold
            text-white
            transition
            hover:bg-[#4f1857]
            active:scale-[0.99]
          "
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default SuccessDialog;