const base=(process.env.LOAD_BASE_URL||process.env.SMOKE_BASE_URL||'http://127.0.0.1:3001').replace(/\/$/,'')
const requests=Math.max(10,Number(process.env.LOAD_REQUESTS||100))
const concurrency=Math.max(1,Number(process.env.LOAD_CONCURRENCY||20))
const maxP95=Number(process.env.LOAD_MAX_P95_MS||2000)
const latencies=[]
let failures=0
let next=0

const worker=async()=>{
  while(true){
    const index=next++
    if(index>=requests)return
    const started=performance.now()
    try{
      const response=await fetch(base+'/api/health',{headers:{'X-Request-ID':'load-'+index}})
      if(!response.ok)failures++
      await response.arrayBuffer()
    }catch{
      failures++
    }finally{
      latencies.push(performance.now()-started)
    }
  }
}

await Promise.all(Array.from({length:Math.min(concurrency,requests)},()=>worker()))
latencies.sort((a,b)=>a-b)
const p95=latencies[Math.min(latencies.length-1,Math.ceil(latencies.length*0.95)-1)]||0
const average=latencies.reduce((a,b)=>a+b,0)/Math.max(1,latencies.length)
if(failures>0)throw new Error('load smoke had '+failures+' failed request(s)')
if(p95>maxP95)throw new Error('load smoke p95 '+p95.toFixed(1)+'ms exceeded '+maxP95+'ms')
console.log(JSON.stringify({ok:true,requests,concurrency,averageMs:Number(average.toFixed(1)),p95Ms:Number(p95.toFixed(1)),failures}))
