"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function YouTubeDownloader() {
  const [isMultipleUrls, setIsMultipleUrls] = useState(false);
  const [singleUrl, setSingleUrl] = useState("");
  const [multipleUrls, setMultipleUrls] = useState([""]);
  const [isLoading, setIsLoading] = useState(false);

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

  const isValidYouTubeUrl = (url: string) => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return pattern.test(url);
  };

  const handleSubmit = async () => {
    const urls = isMultipleUrls ? multipleUrls.filter(url => url.trim()) : [singleUrl];
    
    if (urls.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter at least one URL"
      });
      return;
    }

    const invalidUrls = urls.filter(url => !isValidYouTubeUrl(url));
    if (invalidUrls.length > 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter valid YouTube URLs"
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate processing each URL
    for (const url of urls) {
      try {
        // Here you would typically make an API call or process the URL
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing time
        toast({
          title: "Success",
          description: `Processed: ${url}`
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to process: ${url}`
        });
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-2">
        <Switch
          id="multiple-mode"
          checked={isMultipleUrls}
          onCheckedChange={setIsMultipleUrls}
        />
        <Label htmlFor="multiple-mode">Multiple URLs mode</Label>
      </div>

      {!isMultipleUrls ? (
        <div className="space-y-4">
          <Input
            placeholder="Enter YouTube URL"
            value={singleUrl}
            onChange={(e) => setSingleUrl(e.target.value)}
            disabled={isLoading}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {multipleUrls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Enter YouTube URL"
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
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            onClick={handleAddUrlField}
            disabled={isLoading}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Another URL
          </Button>
        </div>
      )}

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Process Videos'
        )}
      </Button>
    </div>
  );
}