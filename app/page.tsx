"use client";

import { useState } from "react";
import YouTubeDownloader from "@/components/youtube-downloader";
import CSVReviewer from "@/components/csv-reviewer";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [activeSection, setActiveSection] = useState<"videos" | "csv">("csv");

  return (
    <main className="container mx-auto py-8 px-4">
      {/* <h1 className="text-4xl font-bold text-center mb-8">Any Video Downloader</h1> */}

      <div className="flex justify-center space-x-4 mb-8">
        <Button
          variant={activeSection === "csv" ? "default" : "outline"}
          onClick={() => setActiveSection("csv")}
        >
          CSV Reviewer
        </Button>
        <Button
          variant={activeSection === "videos" ? "default" : "outline"}
          onClick={() => setActiveSection("videos")}
          disabled
        >
          Download Bulk Videos
        </Button>
      </div>

      {activeSection === "videos" && <YouTubeDownloader />}
      {activeSection === "csv" && <CSVReviewer />}
    </main>
  );
}
