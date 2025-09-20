import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, CameraOff, Scan, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError: (error: string) => void;
  enabled: boolean;
  className?: string;
}

export function BarcodeScanner({
  onScan,
  onError,
  enabled,
  className = ""
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();

  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>("");
  const [scanCount, setScanCount] = useState(0);

  const toast = useToast();

  // Verificar si el navegador soporta getUserMedia
  const checkCameraSupport = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      onError("Tu navegador no soporta acceso a la cámara");
      return false;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setHasCamera(videoDevices.length > 0);
      return videoDevices.length > 0;
    } catch (error) {
      console.error('Error checking camera support:', error);
      setHasCamera(false);
      return false;
    }
  }, [onError]);

  // Iniciar la cámara
  const startCamera = useCallback(async () => {
    if (!enabled || !hasCamera) return;

    try {
      const constraints = {
        video: {
          facingMode: 'environment', // Cámara trasera en móviles
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      onError("No se pudo acceder a la cámara. Verifica los permisos.");
      toast.toast({
        title: "Error de cámara",
        description: "No se pudo acceder a la cámara. Verifica los permisos.",
        variant: "destructive"
      });
    }
  }, [enabled, hasCamera, onError, toast]);

  // Detener la cámara
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  // Procesar frame del video para detectar códigos de barras
  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Ajustar tamaño del canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar frame del video en el canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Aquí iría la lógica de detección de códigos de barras
    // Por ahora simulamos la detección
    if (Math.random() < 0.001) { // Simular detección aleatoria
      const mockBarcode = `BARCODE${Date.now().toString().slice(-8)}`;
      handleBarcodeDetected(mockBarcode);
    }

    // Continuar procesando frames
    animationRef.current = requestAnimationFrame(processFrame);
  }, [isScanning]);

  // Manejar detección de código de barras
  const handleBarcodeDetected = useCallback((barcode: string) => {
    if (barcode === lastScanned) return; // Evitar duplicados

    setLastScanned(barcode);
    setScanCount(prev => prev + 1);

    // Vibrar si está disponible (para móviles)
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }

    // Notificar detección
    toast.toast({
      title: "Código detectado",
      description: `Código: ${barcode}`,
      variant: "default"
    });

    onScan(barcode);
  }, [lastScanned, onScan, toast]);

  // Manejar entrada manual de código
  const handleManualInput = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const input = event.currentTarget.value.trim();
      if (input) {
        handleBarcodeDetected(input);
        event.currentTarget.value = '';
      }
    }
  }, [handleBarcodeDetected]);

  // Efecto para verificar soporte de cámara al montar
  useEffect(() => {
    checkCameraSupport();
  }, [checkCameraSupport]);

  // Efecto para iniciar/detener escaneo
  useEffect(() => {
    if (enabled && hasCamera) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [enabled, hasCamera, startCamera, stopCamera]);

  // Efecto para procesar frames cuando está escaneando
  useEffect(() => {
    if (isScanning) {
      animationRef.current = requestAnimationFrame(processFrame);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isScanning, processFrame]);

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scan className="h-5 w-5" />
          Lector de Códigos de Barras
          {isScanning && <Badge variant="secondary" className="ml-auto">ESCANEANDO</Badge>}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Vista de la cámara */}
        <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-64 object-cover"
            playsInline
            muted
            style={{ display: isScanning ? 'block' : 'none' }}
          />

          <canvas
            ref={canvasRef}
            className="hidden"
          />

          {/* Overlay cuando no está escaneando */}
          {!isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                {hasCamera ? (
                  <>
                    <CameraOff className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-500">Cámara inactiva</p>
                    <p className="text-sm text-gray-400">Presiona "Iniciar Escaneo"</p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-400" />
                    <p className="text-red-500">Cámara no disponible</p>
                    <p className="text-sm text-gray-400">Usa entrada manual</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Indicador de escaneo */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-48 h-1 bg-red-500 rounded animate-pulse"></div>
              </div>
            </div>
          )}
        </div>

        {/* Controles */}
        <div className="flex gap-2">
          <Button
            onClick={isScanning ? stopCamera : startCamera}
            disabled={!hasCamera || !enabled}
            variant={isScanning ? "destructive" : "default"}
            className="flex-1"
          >
            {isScanning ? (
              <>
                <CameraOff className="h-4 w-4 mr-2" />
                Detener Escaneo
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Iniciar Escaneo
              </>
            )}
          </Button>
        </div>

        {/* Entrada manual */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Entrada Manual:</label>
          <input
            type="text"
            placeholder="Ingresa código de barras manualmente..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={handleManualInput}
            disabled={!enabled}
          />
        </div>

        {/* Estadísticas */}
        <div className="flex justify-between text-sm text-gray-500">
          <span>Escaneos: {scanCount}</span>
          <span>Último: {lastScanned ? lastScanned.slice(-8) : 'Ninguno'}</span>
        </div>

        {/* Estado de la cámara */}
        <div className="flex items-center gap-2 text-sm">
          {hasCamera ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <span>
            {hasCamera ? 'Cámara disponible' : 'Cámara no disponible'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}