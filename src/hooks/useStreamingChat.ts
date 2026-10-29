import { useState,useRef,useEffect } from 'react';
import { toast } from 'sonner';
import { streamChat,type ChatMessage } from '@/lib/chat';
export function useStreamingChat(){const [messages,setMessages]=useState<ChatMessage[]>([]);const [busy,setBusy]=useState(false);const controller=useRef<AbortController>();useEffect(()=>()=>controller.current?.abort(),[]);
 const send=async(content:string,imagePath?:string)=>{if(busy||!content.trim())return;const history:ChatMessage[]=[...messages.slice(-18),{role:'user',content:content.trim()}];setMessages([...history,{role:'assistant',content:''}]);setBusy(true);controller.current=new AbortController();
 try{await streamChat(history,imagePath,text=>setMessages(current=>current.map((m,i)=>i===current.length-1?{...m,content:m.content+text}:m)),controller.current.signal);}catch(error){if(error instanceof Error&&error.name==='AbortError')toast.info('Response stopped');else toast.error(error instanceof Error?error.message:'Unable to reach the assistant');}finally{setBusy(false);}};
 return {messages,busy,send,stop:()=>controller.current?.abort(),clear:()=>setMessages([])};
}
