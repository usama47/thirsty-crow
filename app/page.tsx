import YouTubeDownloader from "@/components/youtube-downloader";

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold text-center mb-8">Any Video Downloader</h1>
      <YouTubeDownloader />
    </main>
  );
}