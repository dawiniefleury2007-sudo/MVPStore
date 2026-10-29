import { z } from 'zod';
import { supabase } from '@/lib/supabase';
export interface ChatMessage {role:'user'|'assistant';content:string;}
const chunkSchema=z.object({choices:z.array(z.object({delta:z.object({content:z.string().optional()})}))});
export async function streamChat(messages:ChatMessage[],imagePath:string|undefined,onText:(text:string)=>void,signal:AbortSignal){
 const {data,error}=await supabase.auth.getSession();if(error||!data.session)throw new Error('Sign in to use the assistant');
 const response=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reseller-chat`,{method:'POST',signal,headers:{Authorization:`Bearer ${data.session.access_token}`,apikey:import.meta.env.VITE_SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({messages,imagePath})});
 if(!response.ok){const body=await response.json();throw new Error(body.error||'xAI request failed');}if(!response.body)throw new Error('The provider did not return a stream');
 const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';
 while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const events=buffer.split('\n\n');buffer=events.pop()||'';for(const event of events){for(const line of event.split('\n')){if(!line.startsWith('data:'))continue;const data=line.slice(5).trim();if(data==='[DONE]')return;let parsed:unknown;try{parsed=JSON.parse(data);}catch{continue;}const chunk=chunkSchema.safeParse(parsed);if(chunk.success){const text=chunk.data.choices[0]?.delta.content;if(text)onText(text);}}}}
}
