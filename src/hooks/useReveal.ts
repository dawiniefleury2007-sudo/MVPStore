import { useEffect } from 'react';
export function useReveal(){useEffect(()=>{const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}});},{threshold:.08});document.querySelectorAll('.scroll-reveal').forEach(el=>observer.observe(el));return()=>observer.disconnect();},[]);}
