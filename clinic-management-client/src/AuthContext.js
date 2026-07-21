import { createContext, useContext, useState } from 'react';
import api from './api';
const AuthContext = createContext(null);
export function AuthProvider({children}) {
  const [user,setUser] = useState(()=>JSON.parse(localStorage.getItem('claracare_user')||'null'));
  const login=async(values)=>{const {data}=await api.post('/auth/login',values);localStorage.setItem('claracare_token',data.token);localStorage.setItem('claracare_user',JSON.stringify(data.user));setUser(data.user);};
  const logout=()=>{localStorage.removeItem('claracare_token');localStorage.removeItem('claracare_user');setUser(null);};
  const updateUser=(next)=>{localStorage.setItem('claracare_user',JSON.stringify(next));setUser(next);};
  return <AuthContext.Provider value={{user,login,logout,updateUser}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
