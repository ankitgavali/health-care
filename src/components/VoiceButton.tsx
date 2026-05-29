import { useState, useRef } from "react";
import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function VoiceButton({ 
  onTranscript,
  positionClassName = "top-1/2 -translate-y-1/2"
}: { 
  onTranscript: (text: string) => void;
  positionClassName?: string;
}) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const handleListen = () => {
    if (listening && recRef.current) {
      try {
        recRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
      setListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice typing is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      recRef.current = rec;
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-IN"; // Configured for English with Indian accent/pronunciation support

      rec.onstart = () => {
        setListening(true);
        toast.info("Listening... speak into your microphone.", { duration: 2000 });
      };

      rec.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        if (result) {
          onTranscript(result);
          toast.success("Speech recognized successfully!");
        }
        setListening(false);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          toast.error("Microphone access denied. Please enable microphone permissions in your browser settings.");
        } else if (event.error !== "no-speech" && event.error !== "aborted") {
          toast.error(`Microphone error: ${event.error}`);
        }
        setListening(false);
      };

      rec.onend = () => {
        setListening(false);
        recRef.current = null;
      };

      rec.start();
    } catch (err) {
      console.error(err);
      setListening(false);
      recRef.current = null;
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleListen}
      className={`absolute right-2 h-8 w-8 rounded-lg text-muted-foreground hover:text-cyan-600 transition-colors ${positionClassName} ${
        listening ? "text-red-500 hover:text-red-600 animate-pulse bg-red-100/50 dark:bg-red-950/20" : ""
      }`}
      title="Voice typing"
    >
      {listening ? <Loader2 className="h-4 w-4 animate-spin text-red-500" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
