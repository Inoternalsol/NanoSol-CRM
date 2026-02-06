"use client";

import { useState, useEffect, useRef } from "react";

export function useWaveform(stream: MediaStream | null, isActive: boolean, barCount: number = 20) {
    const [volumes, setVolumes] = useState<number[]>(new Array(barCount).fill(0));
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const contextRef = useRef<AudioContext | null>(null);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isActive) {
            setVolumes(new Array(barCount).fill(0));
            return;
        }

        if (!stream) {
            // Simulated mode for demo/active call without stream
            const simulate = () => {
                setVolumes(prev => prev.map(() => Math.random() * 60 + 20));
                animationRef.current = requestAnimationFrame(simulate);
            };
            animationRef.current = requestAnimationFrame(simulate);
            return () => {
                if (animationRef.current) cancelAnimationFrame(animationRef.current);
            };
        }

        // Real Audio Analysis
        try {
            const AudioContextClass = window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            contextRef.current = new AudioContextClass();
            const source = contextRef.current.createMediaStreamSource(stream);
            analyzerRef.current = contextRef.current.createAnalyser();
            analyzerRef.current.fftSize = 256;
            source.connect(analyzerRef.current);

            const bufferLength = analyzerRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const update = () => {
                if (!analyzerRef.current) return;
                analyzerRef.current.getByteFrequencyData(dataArray);

                // Sample frequency data to fill barCount
                const newVolumes = [];
                const step = Math.floor(bufferLength / barCount);
                for (let i = 0; i < barCount; i++) {
                    const value = dataArray[i * step] || 0;
                    // Scale 0-255 to 10-100%
                    newVolumes.push((value / 255) * 80 + 10);
                }
                setVolumes(newVolumes);
                animationRef.current = requestAnimationFrame(update);
            };

            update();
        } catch (err) {
            console.error("Waveform analysis error:", err);
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (contextRef.current) contextRef.current.close().catch(() => { });
        };
    }, [stream, isActive, barCount]);

    return volumes;
}
