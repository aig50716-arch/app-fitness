import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, Calendar, Dumbbell, LayoutDashboard, Plus, 
  Settings, Sparkles, TrendingUp, ChevronRight, Clock, Flame, User
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ==========================================
// CONFIGURAÇÃO DA CHAVE DE API
// ==========================================
// O AI Studio preenche isso automaticamente. 
// Se quiser colocar manualmente, substitua process.env.GEMINI_API_KEY por "SUA_CHAVE"
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
// ==========================================

// --- Utils ---
function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short'
  });
};

// --- AI Service ---
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY || "" });

const generateWorkoutPlan = async (goal: string, profile: any) => {
  const model = "gemini-3-flash-preview";
  const prompt = `Crie um plano de treino personalizado para um usuário com o seguinte perfil:
  Objetivo: ${goal}
  Peso: ${profile.weight}kg
  Altura: ${profile.height}cm
  
  Por favor, retorne o treino em formato JSON com a seguinte estrutura:
  {
    "name": "Nome do Treino",
    "description": "Breve descrição",
    "exercises": [
      { "name": "Nome do Exercício", "sets": 3, "reps": 12, "instructions": "Dica rápida" }
    ]
  }
  Responda apenas com o JSON.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error generating workout:", error);
    return null;
  }
};

const getFitnessAdvice = async (query: string) => {
  const model = "gemini-3-flash-preview";
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Você é um personal trainer experiente. Responda à seguinte pergunta de forma motivadora e técnica: ${query}`,
    });
    return response.text;
  } catch (error) {
    return "Erro ao conectar com a IA. Verifique sua chave de API.";
  }
};

// --- Components ---
const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-white rounded-2xl p-6 card-shadow border border-zinc-100", className)}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className, disabled }: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent',
  className?: string,
  disabled?: boolean
}) => {
  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
    ghost: "bg-transparent text-zinc-600 hover:bg-zinc-100",
    accent: "bg-emerald-500 text-white hover:bg-emerald-600"
  };
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

// --- Main App ---
export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workouts' | 'coach' | 'profile'>('dashboard');
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('fitpulse_profile');
    return saved ? JSON.parse(saved) : { name: 'Atleta', weight: 75, height: 175, goal: 'Ganhar massa muscular' };
  });
  const [workouts, setWorkouts] = useState<any[]>(() => {
    const saved = localStorage.getItem('fitpulse_workouts');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('fitpulse_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('fitpulse_workouts', JSON.stringify(workouts));
  }, [workouts]);

  const stats = useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayCalories = workouts
        .filter(w => w.date === dateStr)
        .reduce((acc, w) => acc + w.calories, 0);
      last7Days.push({ date: dateStr, calories: dayCalories });
    }
    return last7Days;
  }, [workouts]);

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 lg:pb-0 lg:pl-64">
      {/* Sidebar - Desktop */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-zinc-100 p-6">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
            <Activity size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">FitPulse AI</h1>
        </div>
        <div className="space-y-2 flex-1">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem active={activeTab === 'workouts'} onClick={() => setActiveTab('workouts')} icon={<Dumbbell size={20} />} label="Treinos" />
          <NavItem active={activeTab === 'coach'} onClick={() => setActiveTab('coach')} icon={<Sparkles size={20} />} label="AI Coach" />
          <NavItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={20} />} label="Perfil" />
        </div>
        <div className="pt-6 border-t border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold">
              {profile.name[0]}
            </div>
            <div>
              <p className="text-sm font-semibold">{profile.name}</p>
              <p className="text-xs text-zinc-500">{profile.goal}</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom Nav - Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-6 py-4 flex justify-between items-center z-50">
        <MobileNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24} />} />
        <MobileNavItem active={activeTab === 'workouts'} onClick={() => setActiveTab('workouts')} icon={<Dumbbell size={24} />} />
        <MobileNavItem active={activeTab === 'coach'} onClick={() => setActiveTab('coach')} icon={<Sparkles size={24} />} />
        <MobileNavItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={24} />} />
      </nav>

      <main className="max-w-5xl mx-auto p-6 lg:p-12">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <Dashboard key="dashboard" stats={stats} workouts={workouts} profile={profile} onViewAll={() => setActiveTab('workouts')} />
          )}
          {activeTab === 'workouts' && (
            <Workouts key="workouts" workouts={workouts} setWorkouts={setWorkouts} />
          )}
          {activeTab === 'coach' && (
            <AICoach key="coach" profile={profile} onWorkoutSaved={(w: any) => setWorkouts([w, ...workouts])} />
          )}
          {activeTab === 'profile' && (
            <Profile key="profile" profile={profile} setProfile={setProfile} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function Dashboard({ stats, workouts, profile, onViewAll }: any) {
  const recentWorkouts = workouts.slice(0, 3);
  const totalCalories = workouts.reduce((acc: number, w: any) => acc + w.calories, 0);
  const totalDuration = workouts.reduce((acc: number, w: any) => acc + w.duration, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Olá, {profile.name}! 👋</h2>
        <p className="text-zinc-500 mt-1">Aqui está o resumo do seu progresso.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Flame size={20} /></div>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Calorias Totais</p>
            <p className="text-2xl font-bold">{totalCalories} kcal</p>
          </div>
        </Card>
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Clock size={20} /></div>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Tempo de Treino</p>
            <p className="text-2xl font-bold">{Math.floor(totalDuration / 60)}h {totalDuration % 60}m</p>
          </div>
        </Card>
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><TrendingUp size={20} /></div>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Sessões</p>
            <p className="text-2xl font-bold">{workouts.length}</p>
          </div>
        </Card>
      </div>
      <Card className="h-80">
        <h3 className="font-semibold mb-6">Atividade Semanal (Calorias)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats}>
            <defs>
              <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
            <XAxis dataKey="date" tickFormatter={formatDate} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#71717a'}} />
            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#71717a'}} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} labelFormatter={formatDate} />
            <Area type="monotone" dataKey="calories" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCal)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Treinos Recentes</h3>
          <Button variant="ghost" className="text-sm" onClick={onViewAll}>Ver todos</Button>
        </div>
        <div className="space-y-3">
          {recentWorkouts.map((w: any, i: number) => (
            <div key={i} onClick={onViewAll} className="flex items-center justify-between p-4 bg-white rounded-xl border border-zinc-100 hover:border-emerald-200 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 group-hover:text-emerald-500 group-hover:bg-emerald-50 transition-colors"><Dumbbell size={24} /></div>
                <div>
                  <p className="font-medium">{w.name}</p>
                  <p className="text-xs text-zinc-500">{formatDate(w.date)} • {w.duration} min</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm font-semibold text-zinc-600">{w.calories} kcal</p>
                <ChevronRight size={16} className="text-zinc-300" />
              </div>
            </div>
          ))}
          {recentWorkouts.length === 0 && <p className="text-center py-8 text-zinc-400 italic">Nenhum treino registrado ainda.</p>}
        </div>
      </div>
    </motion.div>
  );
}

function Workouts({ workouts, setWorkouts }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [newWorkout, setNewWorkout] = useState({ name: '', duration: 30, calories: 200, date: new Date().toISOString().split('T')[0] });

  const handleAdd = () => {
    if (!newWorkout.name) return;
    setWorkouts([{ ...newWorkout, id: Date.now() }, ...workouts]);
    setShowAdd(false);
    setNewWorkout({ name: '', duration: 30, calories: 200, date: new Date().toISOString().split('T')[0] });
  };

  const handleDelete = (id: number) => {
    if (!confirm('Excluir este treino?')) return;
    setWorkouts(workouts.filter((w: any) => w.id !== id));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Seus Treinos</h2>
          <p className="text-zinc-500 mt-1">Histórico completo das suas atividades.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} variant="primary"><Plus size={20} /> Novo Treino</Button>
      </header>
      {showAdd && (
        <Card className="space-y-4 border-emerald-200 bg-emerald-50/30">
          <h3 className="font-semibold">Registrar Treino</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Nome" className="p-3 rounded-xl border border-zinc-200" value={newWorkout.name} onChange={e => setNewWorkout({...newWorkout, name: e.target.value})} />
            <input type="date" className="p-3 rounded-xl border border-zinc-200" value={newWorkout.date} onChange={e => setNewWorkout({...newWorkout, date: e.target.value})} />
            <input type="number" placeholder="Minutos" className="p-3 rounded-xl border border-zinc-200" value={newWorkout.duration} onChange={e => setNewWorkout({...newWorkout, duration: parseInt(e.target.value) || 0})} />
            <input type="number" placeholder="Calorias" className="p-3 rounded-xl border border-zinc-200" value={newWorkout.calories} onChange={e => setNewWorkout({...newWorkout, calories: parseInt(e.target.value) || 0})} />
          </div>
          <div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Button><Button variant="accent" onClick={handleAdd}>Salvar</Button></div>
        </Card>
      )}
      <div className="grid grid-cols-1 gap-4">
        {workouts.map((w: any) => (
          <Card key={w.id} className="flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><Activity size={24} /></div>
              <div>
                <h4 className="font-bold">{w.name}</h4>
                <p className="text-xs text-zinc-500">{formatDate(w.date)} • {w.duration} min • {w.calories} kcal</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="p-2 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(w.id)}><Plus size={20} className="rotate-45" /></Button>
              <ChevronRight size={20} className="text-zinc-300" />
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

function AICoach({ profile, onWorkoutSaved }: any) {
  const [query, setQuery] = useState('');
  const [chat, setChat] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestedWorkout, setSuggestedWorkout] = useState<any>(null);

  const handleAsk = async () => {
    if (!query || loading) return;
    const userMsg = query;
    setQuery('');
    setChat(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const response = await getFitnessAdvice(userMsg);
      setChat(prev => [...prev, { role: 'ai', content: response || '' }]);
    } catch (err) {
      setChat(prev => [...prev, { role: 'ai', content: 'Erro ao conectar com o Coach.' }]);
    } finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setSuggestedWorkout(null);
    try {
      const plan = await generateWorkoutPlan(profile.goal, profile);
      setSuggestedWorkout(plan);
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
      <header className="flex items-center justify-between">
        <div><h2 className="text-3xl font-bold tracking-tight">AI Coach</h2><p className="text-zinc-500 mt-1">Seu treinador pessoal 24/7.</p></div>
        <Button onClick={handleGenerate} variant="accent" disabled={loading}><Sparkles size={20} /> Gerar Treino</Button>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="h-[500px] flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
              {chat.map((msg, i) => (
                <div key={i} className={cn("flex flex-col max-w-[85%]", msg.role === 'user' ? "ml-auto items-end" : "items-start")}>
                  <div className={cn("p-4 rounded-2xl text-sm", msg.role === 'user' ? "bg-emerald-500 text-white rounded-tr-none" : "bg-zinc-100 text-zinc-800 rounded-tl-none")}>
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Pergunte algo..." className="flex-1 p-3 rounded-xl border border-zinc-200" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAsk()} />
              <Button onClick={handleAsk} disabled={loading}>Enviar</Button>
            </div>
          </Card>
        </div>
        <div>
          {suggestedWorkout && (
            <Card className="border-emerald-200">
              <h3 className="font-bold text-emerald-600 mb-2">{suggestedWorkout.name}</h3>
              <div className="space-y-3 mb-4">
                {suggestedWorkout.exercises.map((ex: any, i: number) => (
                  <div key={i} className="text-sm border-b border-zinc-50 pb-2 last:border-0">
                    <p className="font-semibold">{ex.name}</p>
                    <p className="text-xs text-zinc-500">{ex.sets}x{ex.reps}</p>
                  </div>
                ))}
              </div>
              <Button variant="accent" className="w-full text-xs" onClick={() => {
                onWorkoutSaved({ id: Date.now(), name: suggestedWorkout.name, date: new Date().toISOString().split('T')[0], duration: 45, calories: 350 });
                setSuggestedWorkout(null);
                alert('Salvo!');
              }}>Salvar no Histórico</Button>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Profile({ profile, setProfile }: any) {
  const [formData, setFormData] = useState(profile);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl mx-auto space-y-8">
      <header><h2 className="text-3xl font-bold tracking-tight">Seu Perfil</h2></header>
      <Card className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2"><label className="text-sm font-semibold">Nome</label><input type="text" className="w-full p-3 rounded-xl border border-zinc-200" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
          <div className="space-y-2"><label className="text-sm font-semibold">Objetivo</label><select className="w-full p-3 rounded-xl border border-zinc-200 bg-white" value={formData.goal} onChange={e => setFormData({...formData, goal: e.target.value})}><option value="Perder peso">Perder peso</option><option value="Ganhar massa muscular">Ganhar massa muscular</option></select></div>
          <div className="space-y-2"><label className="text-sm font-semibold">Peso (kg)</label><input type="number" className="w-full p-3 rounded-xl border border-zinc-200" value={formData.weight} onChange={e => setFormData({...formData, weight: parseFloat(e.target.value)})} /></div>
          <div className="space-y-2"><label className="text-sm font-semibold">Altura (cm)</label><input type="number" className="w-full p-3 rounded-xl border border-zinc-200" value={formData.height} onChange={e => setFormData({...formData, height: parseFloat(e.target.value)})} /></div>
        </div>
        <Button onClick={() => setProfile(formData)} className="w-full">Salvar</Button>
      </Card>
    </motion.div>
  );
}

function NavItem({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium", active ? "bg-emerald-50 text-emerald-600" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900")}>
      {icon}{label}
    </button>
  );
}

function MobileNavItem({ active, onClick, icon }: any) {
  return (
    <button onClick={onClick} className={cn("p-3 rounded-2xl transition-all", active ? "bg-emerald-50 text-emerald-600" : "text-zinc-400")}>
      {icon}
    </button>
  );
}
