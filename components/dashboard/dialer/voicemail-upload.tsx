"use client";

import { useRef } from "react";
import { Upload, FileAudio, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoicemailUploadProps {
    file: File | null;
    onUpload: (file: File | null) => void;
}

export function VoicemailUpload({ file, onUpload }: VoicemailUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onUpload(e.target.files[0]);
        }
    };

    if (file) {
        return (
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-white/10 w-full mb-3">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="p-1.5 bg-primary/20 rounded-md shrink-0">
                        <FileAudio className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs font-medium truncate pr-2">{file.name}</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 hover:bg-destructive/20 hover:text-destructive rounded-full"
                    onClick={() => onUpload(null)}
                    title="Remove voicemail file"
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>
        );
    }

    return (
        <div className="mb-3 w-full">
            <input
                type="file"
                title="Upload Voicemail"
                accept="audio/mpeg, audio/wav, audio/mp3"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />
            <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed bg-muted/10 hover:bg-muted/30 border-white/20 text-xs py-1.5 h-auto text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload className="h-3 w-3 mr-2" />
                Upload Voicemail (MP3/WAV)
            </Button>
        </div>
    );
}
