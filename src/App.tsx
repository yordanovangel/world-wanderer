import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Register from "./pages/Register.tsx";
import Login from "./pages/Login.tsx";
import Home from "./pages/Home.tsx";
import Create from "./pages/Create.tsx";
import SoloCapture from "./pages/SoloCapture.tsx";
import QuestIntro from "./pages/QuestIntro.tsx";
import QuestScoring from "./pages/QuestScoring.tsx";
import QuestResult from "./pages/QuestResult.tsx";
import QuestComplete from "./pages/QuestComplete.tsx";
import History from "./pages/History.tsx";
import Profile from "./pages/Profile.tsx";
import QuestPlay from "./pages/QuestPlay.tsx";
import RoomLobby from "./pages/RoomLobby.tsx";
import RoomPlay from "./pages/RoomPlay.tsx";
import RoomResults from "./pages/RoomResults.tsx";
import MultiCapture from "./pages/MultiCapture.tsx";
import MultiConfig from "./pages/MultiConfig.tsx";
import Join from "./pages/Join.tsx";
import TreasureWizard from "./pages/TreasureWizard.tsx";
import TreasurePreview from "./pages/TreasurePreview.tsx";
import TreasurePlay from "./pages/TreasurePlay.tsx";
import TreasureScoring from "./pages/TreasureScoring.tsx";
import DevTest from "./pages/DevTest.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Index />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><Create /></ProtectedRoute>} />
              <Route path="/create/solo/capture" element={<ProtectedRoute><SoloCapture /></ProtectedRoute>} />
              <Route path="/create/multi/capture" element={<ProtectedRoute><MultiCapture /></ProtectedRoute>} />
              <Route path="/create/multi/config" element={<ProtectedRoute><MultiConfig /></ProtectedRoute>} />
              <Route path="/create/treasure/wizard" element={<ProtectedRoute><TreasureWizard /></ProtectedRoute>} />
              <Route path="/create/treasure/preview" element={<ProtectedRoute><TreasurePreview /></ProtectedRoute>} />
              <Route path="/quest/:id/treasure-play" element={<ProtectedRoute><TreasurePlay /></ProtectedRoute>} />
              <Route path="/quest/:id/treasure-scoring" element={<ProtectedRoute><TreasureScoring /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/quest/:id/intro" element={<ProtectedRoute><QuestIntro /></ProtectedRoute>} />
              <Route path="/quest/:id/play" element={<ProtectedRoute><QuestPlay /></ProtectedRoute>} />
              <Route path="/quest/:id/scoring" element={<ProtectedRoute><QuestScoring /></ProtectedRoute>} />
              <Route path="/quest/:id/result" element={<ProtectedRoute><QuestResult /></ProtectedRoute>} />
              <Route path="/quest/:id/complete" element={<ProtectedRoute><QuestComplete /></ProtectedRoute>} />
              <Route path="/room/:id/lobby" element={<ProtectedRoute><RoomLobby /></ProtectedRoute>} />
              <Route path="/room/:id/play" element={<ProtectedRoute><RoomPlay /></ProtectedRoute>} />
              <Route path="/room/:id/results" element={<ProtectedRoute><RoomResults /></ProtectedRoute>} />
              <Route path="/join/:token" element={<Join />} />
              {import.meta.env.DEV && (
                <Route path="/dev-test" element={<ProtectedRoute><DevTest /></ProtectedRoute>} />
              )}
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
