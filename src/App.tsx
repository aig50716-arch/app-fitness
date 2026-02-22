import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Calendar, 
  Dumbbell, 
  LayoutDashboard, 
  Plus, 
  Settings, 
  Sparkles,
  TrendingUp,
  ChevronRight,
  Clock,
  Flame,
  User
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from './lib/utils';
import { Workout, UserProfile, DailyStat } from './types';
import { generateWorkoutPlan, getFitnessAdvice } from './services/geminiService';
import Markdown from 'react-markdown';

// --- Components ---

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-white rounded-2xl p-6 card-shadow border border-zinc-100", className)}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  disabled
}: { 
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
        "px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pRes, wRes, sRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/workouts'),
        fetch('/api/stats')
      ]);
      setProfile(await pRes.json());
      setWorkouts(await wRes.json());
      setStats(await sRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-zinc-50">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Activity className="w-8 h-8 text-emerald-500" />
      </motion.div>
    </div>
  );

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
              {profile?.name?.[0]}
            </div>
            <div>
              <p className="text-sm font-semibold">{profile?.name}</p>
              <p className="text-xs text-zinc-500">{profile?.goal}</p>
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

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6 lg:p-12">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <Dashboard key="dashboard" stats={stats} workouts={workouts} profile={profile} />}
          {activeTab === 'workouts' && <Workouts key="workouts" workouts={workouts} onUpdate={fetchData} />}
          {activeTab === 'coach' && <AICoach key="coach" profile={profile} />}
          {activeTab === 'profile' && <Profile key="profile" profile={profile} onUpdate={fetchData} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Sub-pages ---

function Dashboard({ stats, workouts, profile }: { stats: DailyStat[], workouts: Workout[], profile: UserProfile | null }) {
  const recentWorkouts = workouts.slice(0, 3);
  const totalCalories = workouts.reduce((acc, w) => acc + w.calories, 0);
  const totalDuration = workouts.reduce((acc, w) => acc + w.duration, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Olá, {profile?.name}! 👋</h2>
        <p className="text-zinc-500 mt-1">Aqui está o resumo do seu progresso.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Flame size={20} />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+12%</span>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Calorias Totais</p>
            <p className="text-2xl font-bold">{totalCalories} kcal</p>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Clock size={20} />
            </div>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Tempo de Treino</p>
            <p className="text-2xl font-bold">{Math.floor(totalDuration / 60)}h {totalDuration % 60}m</p>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
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
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              labelFormatter={formatDate}
            />
            <Area type="monotone" dataKey="calories" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCal)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Treinos Recentes</h3>
          <Button variant="ghost" className="text-sm">Ver todos</Button>
        </div>
        <div className="space-y-3">
          {recentWorkouts.map((workout) => (
            <div key={workout.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-zinc-100 hover:border-emerald-200 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 group-hover:text-emerald-500 group-hover:bg-emerald-50 transition-colors">
                  <Dumbbell size={24} />
                </div>
                <div>
                  <p className="font-medium">{workout.name}</p>
                  <p className="text-xs text-zinc-500">{formatDate(workout.date)} • {workout.duration} min</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm font-semibold text-zinc-600">{workout.calories} kcal</p>
                <ChevronRight size={16} className="text-zinc-300" />
              </div>
            </div>
          ))}
          {recentWorkouts.length === 0 && (
            <p className="text-center py-8 text-zinc-400 italic">Nenhum treino registrado ainda.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Workouts({ workouts, onUpdate }: { workouts: Workout[], onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newWorkout, setNewWorkout] = useState({
    name: '',
    duration: 30,
    calories: 200,
    date: new Date().toISOString().split('T')[0]
  });

  const handleAdd = async () => {
    if (!newWorkout.name) return;
    await fetch('/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWorkout)
    });
    setShowAdd(false);
    onUpdate();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Seus Treinos</h2>
          <p className="text-zinc-500 mt-1">Histórico completo das suas atividades.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} variant="primary">
          <Plus size={20} />
          Novo Treino
        </Button>
      </header>

      {showAdd && (
        <Card className="space-y-4 border-emerald-200 bg-emerald-50/30">
          <h3 className="font-semibold">Registrar Treino</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase">Nome do Treino</label>
              <input 
                type="text" 
                placeholder="Ex: Musculação Peito"
                className="w-full p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={newWorkout.name}
                onChange={e => setNewWorkout({...newWorkout, name: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase">Data</label>
              <input 
                type="date" 
                className="w-full p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={newWorkout.date}
                onChange={e => setNewWorkout({...newWorkout, date: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase">Duração (min)</label>
              <input 
                type="number" 
                className="w-full p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={newWorkout.duration}
                onChange={e => setNewWorkout({...newWorkout, duration: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase">Calorias (estimado)</label>
              <input 
                type="number" 
                className="w-full p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={newWorkout.calories}
                onChange={e => setNewWorkout({...newWorkout, calories: parseInt(e.target.value)})}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button variant="accent" onClick={handleAdd}>Salvar Treino</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {workouts.map((workout) => (
          <Card key={workout.id} className="flex items-center justify-between hover:border-emerald-200 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Activity size={24} />
              </div>
              <div>
                <h4 className="font-bold">{workout.name}</h4>
                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(workout.date)}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {workout.duration} min</span>
                  <span className="flex items-center gap-1"><Flame size={12} /> {workout.calories} kcal</span>
                </div>
              </div>
            </div>
            <Button variant="secondary" className="p-2 rounded-full">
              <ChevronRight size={20} />
            </Button>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

function AICoach({ profile }: { profile: UserProfile | null }) {
  const [query, setQuery] = useState('');
  const [chat, setChat] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestedWorkout, setSuggestedWorkout] = useState<any>(null);

  const handleAsk = async () => {
    if (!query) return;
    const userMsg = query;
    setQuery('');
    setChat(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const response = await getFitnessAdvice(userMsg);
      setChat(prev => [...prev, { role: 'ai', content: response || 'Desculpe, tive um problema.' }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWorkout = async () => {
    setLoading(true);
    try {
      const plan = await generateWorkoutPlan(profile?.goal || 'Fitness', profile);
      setSuggestedWorkout(plan);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Coach</h2>
          <p className="text-zinc-500 mt-1">Seu treinador pessoal disponível 24/7.</p>
        </div>
        <Button onClick={handleGenerateWorkout} variant="accent" disabled={loading}>
          <Sparkles size={20} />
          Gerar Treino do Dia
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="h-[500px] flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
              {chat.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                  <Sparkles size={48} className="mb-4 text-emerald-500" />
                  <p className="font-medium">Como posso te ajudar hoje?</p>
                  <p className="text-sm">Pergunte sobre exercícios, nutrição ou motivação.</p>
                </div>
              )}
              {chat.map((msg, i) => (
                <div key={i} className={cn(
                  "flex flex-col max-w-[85%]",
                  msg.role === 'user' ? "ml-auto items-end" : "items-start"
                )}>
                  <div className={cn(
                    "p-4 rounded-2xl text-sm",
                    msg.role === 'user' ? "bg-emerald-500 text-white rounded-tr-none" : "bg-zinc-100 text-zinc-800 rounded-tl-none"
                  )}>
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-zinc-400 text-xs italic">
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>Digitando...</motion.div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Pergunte algo..."
                className="flex-1 p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
              />
              <Button onClick={handleAsk} disabled={loading}>Enviar</Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-zinc-900 text-white border-none">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-400" />
              Dica do Dia
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              "A consistência é mais importante que a intensidade. Comece pequeno, mas não pare."
            </p>
          </Card>

          {suggestedWorkout && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-emerald-200">
                <h3 className="font-bold text-emerald-600 mb-2">{suggestedWorkout.name}</h3>
                <p className="text-xs text-zinc-500 mb-4">{suggestedWorkout.description}</p>
                <div className="space-y-3">
                  {suggestedWorkout.exercises.map((ex: any, i: number) => (
                    <div key={i} className="text-sm border-b border-zinc-50 pb-2 last:border-0">
                      <p className="font-semibold">{ex.name}</p>
                      <p className="text-xs text-zinc-500">{ex.sets} séries x {ex.reps} reps</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Profile({ profile, onUpdate }: { profile: UserProfile | null, onUpdate: () => void }) {
  const [formData, setFormData] = useState(profile || { name: '', weight: 0, height: 0, goal: '' });

  const handleSave = async () => {
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    onUpdate();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Seu Perfil</h2>
        <p className="text-zinc-500 mt-1">Mantenha seus dados atualizados para melhores recomendações.</p>
      </header>

      <Card className="space-y-6">
        <div className="flex flex-col items-center py-6">
           <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-3xl font-bold mb-4">
              {formData.name?.[0]}
            </div>
            <h3 className="text-xl font-bold">{formData.name}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-600">Nome</label>
            <input 
              type="text" 
              className="w-full p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-600">Objetivo</label>
            <select 
              className="w-full p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
              value={formData.goal}
              onChange={e => setFormData({...formData, goal: e.target.value})}
            >
              <option value="Perder peso">Perder peso</option>
              <option value="Ganhar massa muscular">Ganhar massa muscular</option>
              <option value="Melhorar condicionamento">Melhorar condicionamento</option>
              <option value="Manter saúde">Manter saúde</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-600">Peso (kg)</label>
            <input 
              type="number" 
              className="w-full p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={formData.weight}
              onChange={e => setFormData({...formData, weight: parseFloat(e.target.value)})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-600">Altura (cm)</label>
            <input 
              type="number" 
              className="w-full p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={formData.height}
              onChange={e => setFormData({...formData, height: parseFloat(e.target.value)})}
            />
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-100 flex justify-end">
          <Button onClick={handleSave} variant="primary" className="w-full md:w-auto">
            Salvar Alterações
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

// --- Helpers ---

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
        active ? "bg-emerald-50 text-emerald-600" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function MobileNavItem({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-3 rounded-2xl transition-all",
        active ? "bg-emerald-50 text-emerald-600" : "text-zinc-400"
      )}
    >
      {icon}
    </button>
  );
}
