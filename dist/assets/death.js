var b=Object.defineProperty;var y=(s,e,a)=>e in s?b(s,e,{enumerable:!0,configurable:!0,writable:!0,value:a}):s[e]=a;var t=(s,e,a)=>y(s,typeof e!="symbol"?e+"":e,a);import{V as g,F as M,s as x,I as u,P as S,W as P,A as F,S as I,a as O,H as z,b as H,c as A,N as L,B as W,d as f,L as B,T as C,t as k,f as U,R as _,U as D,u as E,g as T,h as V,M as v,C as j,O as R,i as h,__tla as q}from"./ObstacleManager.js";Promise.all([(()=>{try{return q}catch{}})()]).then(async()=>{const s={name:"DotScreenShader",uniforms:{tDiffuse:{value:null},tSize:{value:new g(256,256)},center:{value:new g(.5,.5)},angle:{value:1.57},scale:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform vec2 center;
		uniform float angle;
		uniform float scale;
		uniform vec2 tSize;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		float pattern() {

			float s = sin( angle ), c = cos( angle );

			vec2 tex = vUv * tSize - center;
			vec2 point = vec2( c * tex.x - s * tex.y, s * tex.x + c * tex.y ) * scale;

			return ( sin( point.x ) * sin( point.y ) ) * 4.0;

		}

		void main() {

			vec4 color = texture2D( tDiffuse, vUv );

			float average = ( color.r + color.g + color.b ) / 3.0;

			gl_FragColor = vec4( vec3( average * 10.0 - 5.0 + pattern() ), color.a );

		}`};let e=await new M().loadAsync(x);class a{constructor(){t(this,"renderer",null);t(this,"scene",null);t(this,"camera",null);t(this,"lights",[]);t(this,"tanFOV",null);t(this,"initialWindowHeight",null);t(this,"laneObjects",[]);t(this,"composer",null);t(this,"world",null);t(this,"obstacleManager",null);t(this,"lanes",[]);t(this,"currentLane",null);t(this,"currentLaneIndex",u);t(this,"t",.001);t(this,"tStep",.001);t(this,"score",0);this.threeInit(),this.player=new S(this.scene,null),this.cannonInit(),this.inputInit(),this.camera.position.x=80,this.camera.position.y=10,this.camera.position.z=80,this.camera.lookAt(e.position),this.animate=this.animate.bind(this)}threeInit(n=!0){this.renderer=new P({antialias:!0}),this.renderer.setSize(window.innerWidth,window.innerHeight),this.renderer.toneMapping=F,this.scene=new I,this.camera=new O(90,window.innerWidth/window.innerHeight,1,3e4),document.body.appendChild(this.renderer.domElement),console.log(this.renderer.domElement),this.tanFOV=Math.tan(Math.PI/180*this.camera.fov/2),this.initialWindowHeight=window.innerHeight,window.addEventListener("resize",r=>{this.camera.aspect=window.innerWidth/window.innerHeight,this.camera.fov=360/Math.PI*Math.atan(this.tanFOV*(window.innerHeight/this.initialWindowHeight)),this.camera.updateProjectionMatrix(),this.camera.lookAt(this.scene.position),this.renderer.setSize(window.innerWidth,window.innerHeight),this.renderer.render(this.scene,this.camera)});const i=new z(16777147,16777215,2);this.lights.push(i),this.scene.add(i),this.scene.add(new H(i)),this.floor=new A,this.scene.add(this.floor.basePlane),this.lanes=this.floor.validLanes,this.laneObjects=[];for(const r of this.lanes){const w=r.getPoints(L),m=new W().setFromPoints(w),p=new f({fresnelAmount:.9,fresnelOpacity:.9,hologramBrightness:1.7,scanlineSize:2,signalSpeed:2.3,hologramColor:"#89CFF0",hologramOpacity:.6,enableBlinking:!0}),l=new B(m,p);l.rotateX(-Math.PI/2),l.position.set(0,C,0),l.visible=n,this.scene.add(l),this.laneObjects.push(l)}for(const r of e.children)r.material=new f({fresnelAmount:.2,fresnelOpacity:.15,hologramBrightness:.1,scanlineSize:6,signalSpeed:2.3,hologramColor:"#FE0000",hologramOpacity:.5,blinkFresnelOnly:!0,enableBlinking:!0,side:k});e.position.set(0,-13.9,0),e.scale.set(.1,.1,.1),e.visible=!0,e.receiveShadow=!0,this.scene.add(e),this.currentLane=this.lanes[u],this.composer=new U(this.renderer);const o=new _(4,this.scene,this.camera),c=new D(new g(window.innerWidth,window.innerHeight),.8,0),d=new E(s);d.uniforms.scale.value=4,this.composer.addPass(d),this.composer.addPass(o),this.composer.addPass(c)}cannonInit(){this.world=new T({gravity:V}),this.world.addBody(this.floor.body),this.world.addBody(this.player.body);const n=new v("player"),i=new v("obstacle"),o=new j(n,i,{friction:0,restitution:.3});this.world.addContactMaterial(o),this.player.body.material=n,this.obstacleManager=new R(this.player,this.scene,this.world,this.currentLane.xRadius,i),this.obstacleManager.spawnCooldown=0,this.obstacleManager.minForwardAngle=0,this.obstacleManager.maxForwardAngle=Math.PI*2,this.obstacleManager.minSpacing=0,this.obstacleManager.removalThreshold=1/0,this.obstacleManager.maxObstacles=500,this.obstacleManager.obstacleTypes[0].weight=0,this.obstacleManager.obstacleTypes[1].weight=1,this.obstacleManager.obstacleTypes[2].weight=0}inputInit(){document.addEventListener("keydown",n=>{switch(n.code){case"Space":document.location.replace("./index.html");break}})}animate(){requestAnimationFrame(this.animate),this.player.mesh.visible=!1,this.t+=this.tStep,this.t>=1&&(this.t=.001),this.score++;const n=this.player.worldPosition(),i=this.currentLane.getPointAt(this.t),o=i.x,c=i.y,d=n.z;this.player.mesh.position.lerp(new h(o,-13.5,-c),.1);const r=e.position,w=new h(0,5,0),m=r.clone().add(w);e.position.lerp(m,.005),new h().subVectors(new h(o,c,d),n).normalize(),this.world.fixedStep();const p=Math.atan2(-n.z,n.x);this.obstacleManager.update(p,this.player.body.position),document.getElementById("score").innerHTML="You lose!",this.composer.render()}endGame(){this.camera.position.lerp(new h(500,500,500),.01),this.composer.render()}}new a().animate()});
