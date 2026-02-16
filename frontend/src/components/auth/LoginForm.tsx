import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { toast } from "react-toastify";
import { FiLock } from "react-icons/fi";
import { FaCoins, FaWallet } from "react-icons/fa";

interface LoginFormProps {
  onSuccess: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!address.trim()) {
      toast.error("Please enter your wallet address");
      return;
    }
    
    if (!password.trim()) {
      toast.error("Please enter your password");
      return;
    }

    // Validación básica de formato de dirección Ethereum
    if (!address.startsWith("0x") || address.length !== 42) {
      toast.error("Invalid wallet address format");
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await signIn(address, password);
      if (success) {
        onSuccess();
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Wallet Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="0x..."
        icon={<FaWallet />}
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        icon={<FiLock />}
      />
      <Button
        type="submit"
        disabled={isLoading}
        className="
          w-full bg-gradient-to-r from-red-600 to-red-700 
          text-white font-semibold py-2.5 rounded-lg shadow-md 
          hover:from-red-800 hover:to-red-700 
          transition-all duration-200 cursor-pointer flex items-center justify-center gap-2
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        <FaCoins className="text-lg" />
        {isLoading ? "Logging in..." : "Login"}
      </Button>
      
    
    </form>
  );
};