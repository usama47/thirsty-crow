"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";

// Define a generic type for candidate data
interface Candidate {
  [key: string]: any;
}

export default function CSVReviewer() {
  const [file, setFile] = useState<File | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // Parse CSV on upload
  const handleUpload = () => {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCandidates(results.data as Candidate[]);
      },
      error: (err) => {
        console.error("Error parsing CSV:", err);
      },
    });
  };

  // Compute full name from "First Name" and "Last Name" fields
  const getFullName = (candidate: Candidate) => {
    const firstName = candidate["First name"] || "";
    const lastName = candidate["Last name"] || "";
    return `${firstName} ${lastName}`.trim() || "N/A";
  };

  // Get WhatsApp link from WhatsApp or Phone field
  const getWhatsAppLink = (candidate: Candidate) => {
    const contact = candidate["Phone (WhatsApp)"] || candidate["Phone"];
    if (!contact) return null;
    const number = contact.replace(/\D/g, "");
    return number ? `https://wa.me/${number}` : null;
  };

  // Format a date string into a proper English format if the key includes "date"
  const formatValue = (key: string, value: any) => {
    if (typeof value === "string" && key.toLowerCase().includes("date")) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    }
    return value || "N/A";
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold mb-4">CSV Reviewer</h2>

      {/* CSV Upload Section */}
      <div className="flex items-center space-x-2">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4
                     file:rounded file:border-0 file:text-sm file:font-semibold
                     file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
        />
        <Button variant="outline" onClick={handleUpload}>
          Submit CSV
        </Button>
      </div>

      {/* Table View with selected columns */}
      {candidates.length > 0 && (
        <table className="w-full border-collapse border text-sm mt-4">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">Name</th>
              <th className="border p-2">Applied For</th>
              <th className="border p-2">Institute</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate, index) => (
              <tr key={index} className="hover:bg-gray-100 transition-colors">
                <td className="border p-2">{getFullName(candidate)}</td>
                <td className="border p-2">
                  {candidate["Position that you are applying for"] || "N/A"}
                </td>
                <td className="border p-2">{candidate["Institute"] || "N/A"}</td>
                <td className="border p-2">
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCandidate(candidate);
                    }}
                  >
                    View Details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Responsive, Scrollable Modal for Candidate Details */}
      {selectedCandidate && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setSelectedCandidate(null)}
          ></div>
          {/* Modal Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 w-full max-w-2xl p-4 relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setSelectedCandidate(null)}
              className="absolute top-2 right-2 text-xl font-bold"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4">Candidate Details</h3>
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mb-4">
              {selectedCandidate["LinkedIn Url"] && (
                <a
                  href={selectedCandidate["LinkedIn Url"]}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="default">LinkedIn</Button>
                </a>
              )}
              {(selectedCandidate["Resume upload"] || selectedCandidate["CV"]) && (
                <a
                  href={selectedCandidate["Resume upload"] || selectedCandidate["CV"]}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="default">Download Resume</Button>
                </a>
              )}
              {getWhatsAppLink(selectedCandidate) && (
                <a
                  href={getWhatsAppLink(selectedCandidate)!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="default">WhatsApp</Button>
                </a>
              )}
            </div>
            {/* Candidate Details Table */}
            <table className="w-full mt-2 text-sm">
              <tbody>
                {Object.entries(selectedCandidate).map(([key, value]) => (
                  <tr key={key}>
                    <td className="font-semibold p-2 border capitalize">{key}</td>
                    <td className="p-2 border">{formatValue(key, value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
