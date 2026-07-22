import React, { useEffect, useState } from "react";
import { invokeAppFunction } from "@/services/marketService";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
export default function ServicePage({ title, description, functionName, payload={}, children = null }) {
  const [state,setState]=useState({loading:true,data:null,error:""});
  useEffect(()=>{let active=true;invokeAppFunction(functionName,payload).then(data=>active&&setState({loading:false,data,error:""})).catch(e=>active&&setState({loading:false,data:null,error:e.response?.data?.error||e.message}));return()=>{active=false}},[functionName, JSON.stringify(payload)]);
  return <><PageHeader title={title} description={description}/>{state.loading||state.error?<StatusPanel loading={state.loading} error={state.error}/>:children?children(state.data):<StatusPanel/>}</>;
}
