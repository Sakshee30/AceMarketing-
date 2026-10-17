const [url,secondsRaw='120']=process.argv.slice(2)
if(!url) throw new Error('usage: node scripts/ci/wait-for-url.mjs <url> [timeoutSeconds]')
const deadline=Date.now()+Number(secondsRaw)*1000
let last=''
while(Date.now()<deadline){
  try{
    const response=await fetch(url)
    if(response.ok){
      console.log(JSON.stringify({ok:true,url,status:response.status}))
      process.exit(0)
    }
    last='HTTP '+response.status
  }catch(error){
    last=error?.message||String(error)
  }
  await new Promise(resolve=>setTimeout(resolve,2000))
}
throw new Error('Timed out waiting for '+url+': '+last)
