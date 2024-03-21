"use strict";exports.id=610,exports.ids=[610],exports.modules={3610:(e,t,n)=>{n.d(t,{fromHttp:()=>h});var o=n(4029),r=n(8112),s=n(1943),a=n.n(s),i=n(5479),c=n(7415),d=n(5186);const h=e=>{let t;e.logger?.debug("@aws-sdk/credential-provider-http","fromHttp");const n=e.awsContainerCredentialsRelativeUri??process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI,s=e.awsContainerCredentialsFullUri??process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI,h=e.awsContainerAuthorizationToken??process.env.AWS_CONTAINER_AUTHORIZATION_TOKEN,l=e.awsContainerAuthorizationTokenFile??process.env.AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE;if(n&&s&&(console.warn("AWS SDK HTTP credentials provider:","you have set both awsContainerCredentialsRelativeUri and awsContainerCredentialsFullUri."),console.warn("awsContainerCredentialsFullUri will take precedence.")),h&&l&&(console.warn("AWS SDK HTTP credentials provider:","you have set both awsContainerAuthorizationToken and awsContainerAuthorizationTokenFile."),console.warn("awsContainerAuthorizationToken will take precedence.")),s)t=s;else{if(!n)throw new r.C1("No HTTP credential provider host provided.\nSet AWS_CONTAINER_CREDENTIALS_FULL_URI or AWS_CONTAINER_CREDENTIALS_RELATIVE_URI.");t=`http://169.254.170.2${n}`}const p=new URL(t);(e=>{if("https:"!==e.protocol&&"169.254.170.2"!==e.hostname&&"169.254.170.23"!==e.hostname&&"[fd00:ec2::23]"!==e.hostname){if(e.hostname.includes("[")){if("[::1]"===e.hostname||"[0000:0000:0000:0000:0000:0000:0000:0001]"===e.hostname)return}else{if("localhost"===e.hostname)return;const t=e.hostname.split("."),n=e=>{const t=parseInt(e,10);return 0<=t&&t<=255};if("127"===t[0]&&n(t[1])&&n(t[2])&&n(t[3])&&4===t.length)return}throw new r.C1("URL not accepted. It must either be HTTPS or match one of the following:\n  - loopback CIDR 127.0.0.0/8 or [::1/128]\n  - ECS container host 169.254.170.2\n  - EKS container host 169.254.170.23 or [fd00:ec2::23]")}})(p);const u=new o.$c({requestTimeout:e.timeout??1e3,connectionTimeout:e.timeout??1e3});return w=async()=>{const e=function(e){return new i.Kd({protocol:e.protocol,hostname:e.hostname,port:Number(e.port),path:e.pathname,query:Array.from(e.searchParams.entries()).reduce(((e,[t,n])=>(e[t]=n,e)),{}),fragment:e.hash})}(p);h?e.headers.Authorization=h:l&&(e.headers.Authorization=(await a().readFile(l)).toString());try{return async function(e){const t=e?.headers["content-type"]??e?.headers["Content-Type"]??"";t.includes("json")||console.warn("HTTP credential provider response header content-type was not application/json. Observed: "+t+".");const n=(0,d.c9)(e.body),o=await n.transformToString();if(200===e.statusCode){const e=JSON.parse(o);if("string"!=typeof e.AccessKeyId||"string"!=typeof e.SecretAccessKey||"string"!=typeof e.Token||"string"!=typeof e.Expiration)throw new r.C1("HTTP credential provider response not of the required format, an object matching: { AccessKeyId: string, SecretAccessKey: string, Token: string, Expiration: string(rfc3339) }");return{accessKeyId:e.AccessKeyId,secretAccessKey:e.SecretAccessKey,sessionToken:e.Token,expiration:(0,c.EI)(e.Expiration)}}if(e.statusCode>=400&&e.statusCode<500){let t={};try{t=JSON.parse(o)}catch(e){}throw Object.assign(new r.C1(`Server responded with status: ${e.statusCode}`),{Code:t.Code,Message:t.Message})}throw new r.C1(`Server responded with status: ${e.statusCode}`)}((await u.handle(e)).response)}catch(e){throw new r.C1(String(e))}},T=e.maxRetries??3,C=e.timeout??1e3,async()=>{for(let e=0;e<T;++e)try{return await w()}catch(e){await new Promise((e=>setTimeout(e,C)))}return await w()};var w,T,C}}};