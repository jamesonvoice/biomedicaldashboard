
import React from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Globe, 
  Facebook, 
  Linkedin, 
  ExternalLink, 
  Code2, 
  Heart,
  Award,
  Stethoscope
} from 'lucide-react';

const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
      {/* Hero Section */}
      <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 relative overflow-hidden text-center md:text-left">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full translate-x-32 -translate-y-32 opacity-50" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-5xl font-black shadow-2xl shadow-blue-200 border-8 border-white">
            MM
          </div>
          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                System Architect & Developer
              </span>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Md. Mehedi Hasan Murad</h1>
              <p className="text-xl font-bold text-slate-500">Biomedical Engineer</p>
            </div>
            <p className="text-slate-600 leading-relaxed max-w-xl font-medium">
              Passionate Biomedical Engineer dedicated to bridging the gap between healthcare and technology. 
              Architect of <strong>BioMed Pro</strong>, designed to streamline clinical asset management 
              and institutional compliance through modern web solutions.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Information */}
        <div className="space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center ml-2">
            <Code2 size={16} className="mr-2 text-blue-600" /> Professional Channels
          </h3>
          <div className="space-y-4">
            <a 
              href="mailto:mdmuradsorkar26@gmail.com" 
              className="flex items-center p-6 bg-white border border-slate-100 rounded-[2rem] hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors mr-6">
                <Mail size={24} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                <p className="text-sm font-bold text-slate-900 truncate">mdmuradsorkar26@gmail.com</p>
              </div>
              <ExternalLink size={16} className="text-slate-300 group-hover:text-blue-600" />
            </a>

            <a 
              href="tel:01302050172" 
              className="flex items-center p-6 bg-white border border-slate-100 rounded-[2rem] hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors mr-6">
                <Phone size={24} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Call / WhatsApp</p>
                <p className="text-sm font-bold text-slate-900 truncate">01302050172</p>
              </div>
              <ExternalLink size={16} className="text-slate-300 group-hover:text-emerald-600" />
            </a>

            <a 
              href="http://mdmurad.com.bd" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center p-6 bg-white border border-slate-100 rounded-[2rem] hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
              <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-colors mr-6">
                <Globe size={24} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Portfolio Website</p>
                <p className="text-sm font-bold text-slate-900 truncate">mdmurad.com.bd</p>
              </div>
              <ExternalLink size={16} className="text-slate-300 group-hover:text-purple-600" />
            </a>
          </div>
        </div>

        {/* Social Presence */}
        <div className="space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center ml-2">
            <Heart size={16} className="mr-2 text-red-500" /> Social Connectivity
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <a 
                href="https://www.facebook.com/murad4423" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-between p-6 bg-blue-600 text-white rounded-[2rem] shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <div className="flex items-center">
                  <div className="p-3 bg-white/20 rounded-xl mr-4"><Facebook size={20} /></div>
                  <span className="font-black uppercase tracking-widest text-xs">Facebook Profile</span>
                </div>
                <ExternalLink size={16} className="opacity-60" />
              </a>

              <a 
                href="https://www.linkedin.com/in/murad-8a2007257" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-between p-6 bg-[#0077b5] text-white rounded-[2rem] shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <div className="flex items-center">
                  <div className="p-3 bg-white/20 rounded-xl mr-4"><Linkedin size={20} /></div>
                  <span className="font-black uppercase tracking-widest text-xs">LinkedIn Network</span>
                </div>
                <ExternalLink size={16} className="opacity-60" />
              </a>
            </div>

            <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden">
              <Award className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-[0.05]" />
              <div className="relative z-10">
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-4">Core Mission</p>
                <p className="text-sm font-medium italic leading-relaxed text-slate-300">
                  "Advancing healthcare through precision asset engineering and digital efficiency."
                </p>
                <div className="mt-6 flex items-center space-x-2">
                  <Stethoscope className="text-blue-400" size={18} />
                  <span className="text-[10px] font-black uppercase tracking-tighter text-slate-500">BioMed Pro Infrastructure</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-8">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Developed with Excellence • 2024</p>
      </div>
    </div>
  );
};

export default About;
