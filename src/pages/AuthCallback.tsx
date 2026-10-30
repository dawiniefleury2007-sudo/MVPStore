import { useEffect,useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import { exchangeOAuthCodeOnce } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
export default function AuthCallback(){const [error,setError]=useState('');const navigate=useNavigate();const {google,apple,discord}=useAuth();
 useEffect(()=>{const params=new URLSearchParams(window.location.search);const popup=window.name==='onspace-oauth';const failure=params.has('error')||params.has('error_code');const message='第三方登录未完成，请返回登录页面重试。';
 if(failure){if(popup&&window.opener){window.opener.postMessage({type:'OAUTH_ERROR',message},'*');window.close();}else setError(message);return;}
 const code=params.get('code');if(code&&popup){if(!window.opener){setError('登录弹窗与主页面的连接已断开，请重新登录。');return;}window.opener.postMessage({type:'OAUTH_CODE',code},'*');window.close();return;}
 if(code){void exchangeOAuthCodeOnce(code).then(()=>{const reset=params.get('next')==='reset';window.history.replaceState({},'', '/auth/callback');navigate(reset?'/reset-password':'/account?nav=overview',{replace:true});},(e:Error)=>setError(e.message));}else setError('No authorization code was received. Restart login.');
 },[navigate]);
 return <main className="min-h-screen grid place-items-center px-5"><section className="glass p-8 max-w-lg"><h1 className="section-title">Completing your sign-in</h1>{error?<><p className="text-danger mt-4">{error}</p><Link to="/login" className="btn-secondary mt-5">Return to login</Link><div className="flex flex-wrap gap-3 mt-5"><button className="btn-secondary" onClick={()=>void google().catch(e=>setError(e.message))}>Restart Google</button><button className="btn-secondary" onClick={()=>void apple().catch(e=>setError(e.message))}>Restart Apple</button><button className="btn-secondary" onClick={()=>void discord().catch(e=>setError(e.message))}>Restart Discord</button></div></>:<p className="text-muted mt-4">Verifying your session…</p>}</section></main>;
}
