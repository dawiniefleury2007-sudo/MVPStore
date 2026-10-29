import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { TRANSLATIONS, type Language } from '@/constants/translations';
interface LanguageValue {language:Language;setLanguage:(lang:Language)=>void;t:(key:string)=>string;}
const Context=createContext<LanguageValue>({language:'en',setLanguage:()=>{},t:k=>k});
export function LanguageProvider({children}:{children:ReactNode}){const [language,setLanguage]=useState<Language>((localStorage.getItem('mvp-language') as Language)||'en');useEffect(()=>{localStorage.setItem('mvp-language',language);document.documentElement.lang=language;},[language]);return <Context.Provider value={{language,setLanguage,t:key=>TRANSLATIONS[language]?.[key]||TRANSLATIONS.en[key]||key}}>{children}</Context.Provider>;}
export const useLanguage=()=>useContext(Context);
