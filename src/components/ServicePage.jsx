import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
export default function ServicePage({ title, description, functionName, payload={}, children }) {
  const [state,setState]=useState({loading:true,data:null,error:""});
  useEffect(()=>{let active=true;const request={...payload,session_id:localStorage.getItem('kmy_session_id')};base44.functions.invoke(functionName,request).then(r=>active&&setState({loading:false,data:r.data,error:""})).catch(e=>active&&setState({loading:false,data:null,error:e.response?.data?.error||e.message}));return()=>{active=false}},[functionName]);
  return <><PageHeader title={title} description={description}/>{state.loading||state.error?<StatusPanel loading={state.loading} error={state.error}/>:children?children(state.data):<StatusPanel/>}</>;
}