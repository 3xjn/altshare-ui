import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from 'react';

export const PasswordPrompt = ({ 
  onConfirm,
  onPasswordEntered
}: { 
  onConfirm: () => void,
  onPasswordEntered: (password: string) => Promise<void>
}) => {
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    try {
      await onPasswordEntered(password);
      onConfirm();
    } catch (error) {
      console.error('Password verification failed:', error);
    }
  };

  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter Your Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showPasswordToggle
            placeholder="Password"
          />
          <Button onClick={handleSubmit} className="w-full">
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 