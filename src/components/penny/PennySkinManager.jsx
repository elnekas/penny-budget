import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Trash2, Sparkles } from 'lucide-react';

export default function PennySkinManager({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(null);

  const { data: skins = [] } = useQuery({
    queryKey: ['pennySkins'],
    queryFn: () => base44.entities.PennySkin.list(),
  });

  const activeSkin = skins.find(s => s.is_active);

  const createSkinMutation = useMutation({
    mutationFn: (data) => base44.entities.PennySkin.create(data),
    onSuccess: () => queryClient.invalidateQueries(['pennySkins']),
  });

  const updateSkinMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PennySkin.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['pennySkins']),
  });

  const handleFileUpload = async (e, field, skinId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(field);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (skinId) {
        updateSkinMutation.mutate({ id: skinId, data: { [field]: file_url } });
      } else {
        createSkinMutation.mutate({ 
          name: "My Penny Skin", 
          [field]: file_url,
          is_active: true 
        });
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(null);
    }
  };

  const ensureSkin = () => {
    if (skins.length === 0) {
      createSkinMutation.mutate({ name: "Default Skin", is_active: true });
    }
  };

  const currentSkin = activeSkin || skins[0] || { id: null };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={ensureSkin}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Customize Penny's Appearance
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { id: 'meditating_url', label: 'Idle / Resting', desc: 'Looping GIF when Penny is idle' },
              { id: 'waking_up_url', label: 'Waking Up', desc: 'Transition when chat opens' },
              { id: 'working_url', label: 'Thinking / Working', desc: 'Active processing state' },
              { id: 'success_url', label: 'Success', desc: 'Task completed successfully' },
              { id: 'failure_url', label: 'Failure', desc: 'Something went wrong' },
            ].map((slot) => (
              <div key={slot.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <Label className="text-base font-medium">{slot.label}</Label>
                    <p className="text-xs text-slate-500">{slot.desc}</p>
                  </div>
                  {currentSkin[slot.id] && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-red-400 hover:text-red-600"
                      onClick={() => updateSkinMutation.mutate({ id: currentSkin.id, data: { [slot.id]: null } })}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                <div className="aspect-square bg-white rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-300 transition-colors">
                  {currentSkin[slot.id] ? (
                    <img 
                      src={currentSkin[slot.id]} 
                      alt={slot.label} 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-4">
                      {uploading === slot.id ? (
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
                      ) : (
                        <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      )}
                      <span className="text-xs text-slate-400">Upload GIF</span>
                    </div>
                  )}
                  
                  <input
                    type="file"
                    accept=".gif,.webp,.png"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploading}
                    onChange={(e) => handleFileUpload(e, slot.id, currentSkin.id)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
             <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}