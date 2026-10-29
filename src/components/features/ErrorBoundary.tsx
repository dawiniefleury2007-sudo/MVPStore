import { Component, type ReactNode, type ErrorInfo } from 'react';
interface Props {children:ReactNode;}
interface State {failed:boolean;}
export default class ErrorBoundary extends Component<Props,State>{state:State={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(error:Error,info:ErrorInfo){console.error('MVP rendering error',error,info.componentStack);}render(){if(this.state.failed)return <div className="min-h-screen flex items-center justify-center p-6"><div className="glass p-8 text-center"><h1 className="text-2xl font-bold">Unable to display this page</h1><p className="text-muted mt-3">Reload your browser to retry. Your account records remain stored securely in OnSpace Cloud.</p></div></div>;return this.props.children;}}
