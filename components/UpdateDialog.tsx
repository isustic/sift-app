'use client';

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UpdateDialogProps {
  open: boolean;
  version: string;
  onClose: () => void;
}

export function UpdateDialog({ open, version, onClose }: UpdateDialogProps) {
  const [isRestarting, setIsRestarting] = useState(false);

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      await invoke('restart_app');
    } catch (error) {
      console.error('Failed to restart:', error);
      setIsRestarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Available</DialogTitle>
          <DialogDescription>
            Version {version} is ready to install. Restart to apply the update.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isRestarting}>
            Later
          </Button>
          <Button onClick={handleRestart} disabled={isRestarting}>
            {isRestarting ? 'Restarting...' : 'Restart Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
