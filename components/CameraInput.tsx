
import React, { useRef, useState } from 'react';

interface CameraInputProps {
  onImageCaptured: (base64: string) => void;
  isLoading: boolean;
}

export const CameraInput: React.FC<CameraInputProps> = ({ onImageCaptured, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result?.toString().split(',')[1];
      if (base64) onImageCaptured(base64);
    };
    reader.readAsDataURL(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div 
      className={`relative w-full max-w-3xl mx-auto rounded-[3rem] border-2 border-dashed transition-all duration-700 ease-in-out group ${
        dragActive ? 'border-black bg-slate-50' : 'border-slate-200 bg-white'
      } ${isLoading ? 'opacity-90 cursor-wait' : 'hover:border-black hover:shadow-2xl'}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Corner Accents */}
      <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-slate-200 group-hover:border-black rounded-tl-3xl transition-colors duration-500"></div>
      <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-slate-200 group-hover:border-black rounded-tr-3xl transition-colors duration-500"></div>
      <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-slate-200 group-hover:border-black rounded-bl-3xl transition-colors duration-500"></div>
      <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-slate-200 group-hover:border-black rounded-br-3xl transition-colors duration-500"></div>

      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        capture="environment"
        className="hidden" 
        onChange={onFileChange}
      />
      
      <div className="p-16 text-center relative z-10">
        {isLoading ? (
          <div className="flex flex-col items-center py-10">
            <div className="relative mb-10">
              <div className="w-24 h-24 border-4 border-slate-100 rounded-full"></div>
              <div className="absolute inset-0 w-24 h-24 border-t-4 border-black rounded-full animate-spin"></div>
              <i className="fas fa-wand-magic-sparkles absolute inset-0 flex items-center justify-center text-black text-2xl"></i>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Processing Vision</h2>
            <p className="text-slate-500 max-w-sm mx-auto font-medium text-lg leading-relaxed">
              Identifying ingredients and assessing inventory in high-fidelity.
            </p>
          </div>
        ) : (
          <>
            <div className="w-28 h-28 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-black mx-auto mb-10 shadow-xl group-hover:scale-110 transition-all duration-500 border border-slate-100">
              <i className="fas fa-camera text-4xl"></i>
            </div>
            
            <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">Snap Your Fridge</h2>
            <p className="text-slate-500 mb-12 max-w-lg mx-auto font-medium text-lg leading-relaxed opacity-80">
              Show us what you've got. Our AI will analyze your shelves and suggest curated recipes.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-10 py-5 bg-black text-white font-black rounded-2xl hover:bg-slate-900 shadow-2xl transition-all active:scale-95 group/btn overflow-hidden relative"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  <i className="fas fa-camera-retro text-lg"></i>
                  Capture Fridge
                </span>
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-10 py-5 bg-white text-slate-900 border-2 border-slate-200 font-black rounded-2xl hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <i className="fas fa-upload text-slate-400"></i>
                Browse Gallery
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
