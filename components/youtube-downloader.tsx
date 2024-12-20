"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useTheme } from "next-themes";
import { toast } from "@/hooks/use-toast";

const SUPPORTED_DOMAINS = [
  "youtube.com",
  "vimeo.com",
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "soundcloud.com",
  "twitter.com",
  "ted.com",
];

export default function YouTubeDownloader() {
  const [isMultipleUrls, setIsMultipleUrls] = useState(false);
  const [singleUrl, setSingleUrl] = useState("");
  const [multipleUrls, setMultipleUrls] = useState([""]);
  const [videoList, setVideoList] = useState([]); // To store videos returned from the API
  const [isLoading, setIsLoading] = useState(false);
  const { theme, setTheme } = useTheme();

  const isValidUrl = (url: string) => {
    return SUPPORTED_DOMAINS.some((domain) => url.includes(domain));
  };

  const handleAddUrlField = () => {
    setMultipleUrls([...multipleUrls, ""]);
  };

  const handleRemoveUrlField = (index: number) => {
    const newUrls = multipleUrls.filter((_, i) => i !== index);
    setMultipleUrls(newUrls);
  };

  const handleMultipleUrlChange = (index: number, value: string) => {
    const newUrls = [...multipleUrls];
    newUrls[index] = value;
    setMultipleUrls(newUrls);
  };

  const handleSubmit = async () => {
    const urls = isMultipleUrls ? multipleUrls.filter((url) => url.trim()) : [singleUrl];

    if (urls.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter at least one URL.",
      });
      return;
    }

    const invalidUrls = urls.filter((url) => !isValidUrl(url));
    if (invalidUrls.length > 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Unsupported URLs: ${invalidUrls.join(", ")}`,
      });
      return;
    }

    setIsLoading(true);
    setVideoList([]); // Clear the previous list

    try {
      const response = await fetch("https://6c758110-0bd5-4216-b90e-8ca86ce88063-00-24tlew9tipsge.sisko.replit.dev/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ video_links: urls }),
      });

      if (response.ok) {
        const data = await response.json();

        const videos = data.results
          .map((result: any) => {
            if (result.download_url) {
              return { title: result.title, downloadUrl: result.download_url };
            } else {
              toast({
                variant: "destructive",
                title: "Error",
                description: `Failed to process: ${result.url} (${result.error})`,
              });
              return null;
            }
          })
          .filter(Boolean);

        setVideoList(videos);
        toast({
          title: "Success",
          description: "Videos processed successfully. Ready for download.",
        });
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to process videos.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while processing the videos.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadVideo = (video: { title: string; downloadUrl: string }) => {
    const anchor = document.createElement("a");
    anchor.href = video.downloadUrl;
    anchor.download = `${video.title}.mp4`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 transition-all">
      {/* Theme Toggle */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="flex items-center hover:scale-105 transition-transform"
        >
          {theme === "light" ? <Brightness4Icon /> : <Brightness7Icon />}
          <span className="ml-2">{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
        </Button>
      </div>

      <h1 className="text-2xl font-bold text-center">Any Video Downloader</h1>
      <p className="text-center text-gray-500">
        Download videos from multiple platforms like YouTube, TikTok, and Instagram, etc.
      </p>

      <div className="flex items-center space-x-2">
        <Switch
          id="multiple-mode"
          checked={isMultipleUrls}
          onCheckedChange={setIsMultipleUrls}
        />
        <Label htmlFor="multiple-mode">Multiple URLs mode</Label>
      </div>

      {!isMultipleUrls ? (
        <Input
          placeholder="Enter a video URL (e.g., https://youtube.com/...)"
          value={singleUrl}
          onChange={(e) => setSingleUrl(e.target.value)}
          disabled={isLoading}
        />
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            multipleUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Enter a video URL (e.g., https://youtube.com/...)"
                  value={url}
                  onChange={(e) => handleMultipleUrlChange(index, e.target.value)}
                  disabled={isLoading}
                />
                {multipleUrls.length > 1 && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleRemoveUrlField(index)}
                    disabled={isLoading}
                    className="hover:scale-105 transition-transform"
                  >
                    <DeleteIcon />
                  </Button>
                )}
              </div>
            ))
          )}
          <Button
            variant="outline"
            onClick={handleAddUrlField}
            disabled={isLoading}
            className="hover:scale-105 transition-transform"
          >
            Add Another URL
          </Button>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        className="hover:scale-105 transition-transform"
      >
        {isLoading ? "Processing..." : "Process Videos"}
      </Button>

      {/* Video List */}
      {videoList.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Processed Videos</h3>
          {videoList.map((video, index) => (
            <div
              key={index}
              className="flex items-center justify-between transition-transform hover:scale-105"
            >
              <span>{video.title}</span>
              <Button
                variant="outline"
                onClick={() => downloadVideo(video)}
                className="hover:scale-105 transition-transform"
              >
                <DownloadIcon />
              </Button>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
        </div>
      )}

      {/* Supported Platforms */}
      <div className="border p-4 rounded-md bg-gray-100 dark:bg-gray-800">
        <h2 className="text-lg font-bold mb-2">Supported Platforms</h2>
        <ul className="list-disc pl-4">
          {SUPPORTED_DOMAINS.map((domain, index) => (
            <li key={index} className="text-gray-600 dark:text-gray-300">
              {domain}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
