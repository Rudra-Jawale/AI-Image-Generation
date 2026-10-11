import {useEffect, useState} from "react";

export default function ImageGenerator(){
    const [prompt, setPrompt] = useState("");
    const [width, setWidth] = useState("512");
    const [height, setHeight] = useState("512");
    const [seed, setSeed] = useState("");
    const [imageUrl, setImageUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        return () => {
            if (imageUrl) URL.revokeObjectURL(imageUrl);
        };
    }, [imageUrl]);

    function buildUrl(){
        let url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt.trim()
    )}?width=${width}&height=${height}&nologo=true`;
    if (seed.trim()) url += `&seed=${encodeURIComponent(seed.trim())}`;
    url += `&_=${Date.now()}`;
    return url;
    }

    async function handleGenerate(){
        if (!prompt.trim()) {
            setError("Type a prompt first.");
            return;
        }
        setError(null);
        setLoading(true);
        setImageUrl(null);

        const url = buildUrl();
        let failureMessage = "The image service could not be reached. Check your connection and try again.";

        for (let attempt = 0; attempt < 3; attempt += 1) {
            let objectUrl;
            let timeout;

            try {
                const controller = new AbortController();
                timeout = setTimeout(() => controller.abort(), 120000);
                const response = await fetch(url, {signal: controller.signal});

                if (!response.ok) {
                    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
                        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
                        continue;
                    }
                    throw new Error(
                        response.status === 429
                            ? "The image service is busy (HTTP 429)."
                            : `The image service returned HTTP ${response.status}.`
                    );
                }

                const contentType = response.headers.get("content-type") || "";
                if (!contentType.startsWith("image/")) {
                    throw new Error("The image service returned an invalid response.");
                }

                objectUrl = URL.createObjectURL(await response.blob());
                const image = new Image();
                image.src = objectUrl;
                await image.decode();

                setImageUrl(objectUrl);
                objectUrl = null;
                setLoading(false);
                return;
            } catch (requestError) {
                if (objectUrl) URL.revokeObjectURL(objectUrl);

                failureMessage = requestError instanceof Error
                    ? requestError.name === "AbortError"
                        ? "The image service timed out. Please try again."
                        : requestError.message
                    : "An unexpected error occurred.";

                const retryable = requestError instanceof TypeError
                    || (requestError instanceof Error
                        && ["AbortError", "EncodingError"].includes(requestError.name));
                if (retryable && attempt < 2) {
                    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
                    continue;
                }
                break;
            } finally {
                clearTimeout(timeout);
            }
        }

        setError(`Generation failed: ${failureMessage}`);
        setLoading(false);
    }

    function handleKeyDown(e){
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleGenerate();
        }
    }

    return (
         <div className="min-h-screen w-full flex items-center justify-center bg-neutral-950 p-6">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl p-7">
        <h1 className="text-xl font-semibold text-neutral-100">Text → Image</h1>
        <p className="text-sm text-neutral-400 mt-1 mb-5">
          {/* Free, no API key required (powered by Pollinations.ai). */}
        </p>
 
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. a lighthouse on a cliff at sunset, oil painting style"
          className="w-full min-h-[80px] bg-neutral-950 text-neutral-100 border border-neutral-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600 resize-y"
        />
 
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="flex-1 min-w-[110px]">
            <label className="block text-xs text-neutral-400 mb-1">Width</label>
            <select
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="w-full bg-neutral-950 text-neutral-100 border border-neutral-800 rounded-lg p-2 text-sm"
            >
              <option value="512">512</option>
              <option value="768">768</option>
              <option value="1024">1024</option>
            </select>
          </div>
          <div className="flex-1 min-w-[110px]">
            <label className="block text-xs text-neutral-400 mb-1">Height</label>
            <select
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full bg-neutral-950 text-neutral-100 border border-neutral-800 rounded-lg p-2 text-sm"
            >
              <option value="512">512</option>
              <option value="768">768</option>
              <option value="1024">1024</option>
            </select>
          </div>
          <div className="flex-1 min-w-[110px]">
            <label className="block text-xs text-neutral-400 mb-1">Seed (optional)</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="random"
              className="w-full bg-neutral-950 text-neutral-100 border border-neutral-800 rounded-lg p-2 text-sm"
            />
          </div>
        </div>
 
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full mt-4 py-3 rounded-xl font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Generating…" : "Generate"}
        </button>
 
        <div className="mt-5 min-h-[60px] flex flex-col items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-[3px] border-neutral-700 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-sm text-neutral-400 text-center">
                Generating, this can take 10–30 seconds…
              </p>
            </div>
          )}
 
          {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
 
          {imageUrl && !loading && (
            <div className="w-full flex flex-col items-center">
              <img
                src={imageUrl}
                alt={prompt}
                className="w-full rounded-xl border border-neutral-800"
              />
              <a
                href={imageUrl}
                download="generated-image.png"
                target="_blank"
                rel="noreferrer"
                className="mt-3 text-sm text-violet-400 hover:text-violet-300"
              >
                Download image
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
    );
}