const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
const rooms = new Map();
const QUESTIONS = [
  {method:"Sustitución", text:"Resuelve: x + y = 9 y 2x − y = 6. ¿Cuál es la solución?", answers:["x=5, y=4","x=4, y=5","x=3, y=6","x=6, y=3"], correct:0},
  {method:"Reducción", text:"Resuelve: 2x + y = 7 y 2x − y = 3. ¿Cuál es la solución?", answers:["x=2, y=3","x=3, y=1","x=4, y=−1","x=1, y=5"], correct:1},
  {method:"Igualación", text:"Resuelve: x + y = 10 y x − y = 2. ¿Cuál es la solución?", answers:["x=6, y=4","x=4, y=6","x=5, y=5","x=7, y=3"], correct:0},
  {method:"Determinantes", text:"Resuelve: 2x + y = 7 y x − y = 2. ¿Cuál es la solución?", answers:["x=2, y=3","x=3, y=1","x=1, y=5","x=4, y=−1"], correct:1},
  {method:"Gráfico", text:"Las rectas y = x + 1 y y = 7 − x se cortan en:", answers:["(2,5)","(3,4)","(4,3)","(5,2)"], correct:1},
  {method:"Sustitución", text:"Resuelve: 3x + y = 11 y y = 2. ¿Cuál es la solución?", answers:["x=2, y=2","x=3, y=2","x=4, y=2","x=3, y=1"], correct:1},
  {method:"Reducción", text:"Resuelve: x + 2y = 8 y x − 2y = 0. ¿Cuál es la solución?", answers:["x=2, y=3","x=4, y=2","x=3, y=4","x=4, y=1"], correct:1},
  {method:"Igualación", text:"Resuelve: 2x + y = 9 y x + y = 6. ¿Cuál es la solución?", answers:["x=2, y=4","x=3, y=3","x=4, y=2","x=1, y=5"], correct:1},
  {method:"Determinantes", text:"Resuelve: x + y = 5 y 2x + 3y = 13. ¿Cuál es la solución?", answers:["x=2, y=3","x=3, y=2","x=1, y=4","x=4, y=1"], correct:0},
  {method:"Gráfico", text:"Las rectas y = 2x + 1 y y = x + 4 se cortan en:", answers:["(2,5)","(3,7)","(4,9)","(1,3)"], correct:1},
  {method:"Sustitución", text:"Resuelve: x − y = 4 y y = 3. ¿Cuál es la solución?", answers:["x=6, y=3","x=7, y=3","x=7, y=4","x=4, y=3"], correct:1},
  {method:"Reducción", text:"Resuelve: 3x + 2y = 13 y 3x − 2y = 5. ¿Cuál es la solución?", answers:["x=2, y=3","x=3, y=2","x=4, y=1","x=3, y=1"], correct:1},
  {method:"Igualación", text:"Resuelve: 2x − y = 1 y x + y = 5. ¿Cuál es la solución?", answers:["x=2, y=3","x=3, y=2","x=1, y=4","x=4, y=1"], correct:0},
  {method:"Determinantes", text:"Resuelve: 3x + 2y = 12 y x − y = 1. ¿Cuál es la solución?", answers:["x=14/5, y=9/5","x=3, y=2","x=2, y=3","x=12/5, y=7/5"], correct:0},
  {method:"Gráfico", text:"Las rectas y = 3x − 2 y y = x + 4 se cortan en:", answers:["(2,6)","(3,7)","(4,8)","(1,5)"], correct:1}
];
function roomId(){let id;do{id="EC-"+Math.floor(10000+Math.random()*90000)}while(rooms.has(id));return id}
function publicRoom(room){return {id:room.id,hostId:room.hostId,started:room.started,questionIndex:room.questionIndex,endsAt:room.endsAt,players:[...room.players.values()].map(p=>({id:p.id,name:p.name,animal:p.animal,ready:p.ready,score:p.score}))}}
function emitRoom(room){io.to(room.id).emit("room:update",publicRoom(room))}
function finishRoom(room){if(!room.started)return;room.started=false;room.endsAt=null;io.to(room.id).emit("game:finished",publicRoom(room));emitRoom(room)}
io.on("connection",socket=>{
 socket.on("room:create",({name,animal})=>{name=String(name||"").trim().slice(0,20);animal=String(animal||"🐹").slice(0,2);if(!name)return socket.emit("error:msg","Escribe tu nombre.");const id=roomId();const room={id,hostId:socket.id,started:false,questionIndex:0,endsAt:null,timer:null,players:new Map()};room.players.set(socket.id,{id:socket.id,name,animal,ready:true,score:0,lastQuestion:-1});rooms.set(id,room);socket.join(id);socket.emit("room:created",{id});emitRoom(room)});
 socket.on("room:join",({id,name,animal})=>{id=String(id||"").trim().toUpperCase();name=String(name||"").trim().slice(0,20);animal=String(animal||"🐹").slice(0,2);const room=rooms.get(id);if(!room)return socket.emit("error:msg","No existe esa sala.");if(room.started)return socket.emit("error:msg","La partida ya comenzó.");if(!name)return socket.emit("error:msg","Escribe tu nombre.");room.players.set(socket.id,{id:socket.id,name,animal,ready:true,score:0,lastQuestion:-1});socket.join(id);socket.emit("room:joined",{id});emitRoom(room)});
 socket.on("player:ready",({id,ready})=>{const room=rooms.get(String(id||"").toUpperCase());const p=room?.players.get(socket.id);if(!p||room.started)return;p.ready=!!ready;emitRoom(room)});
 socket.on("game:start",({id})=>{const room=rooms.get(String(id||"").toUpperCase());if(!room||room.hostId!==socket.id||room.started)return;const players=[...room.players.values()];if(players.length<1||!players.every(p=>p.ready))return socket.emit("error:msg","Todos deben estar listos.");room.started=true;room.questionIndex=0;room.endsAt=Date.now()+300000;for(const p of players){p.score=0;p.lastQuestion=-1}io.to(room.id).emit("game:start",{questions:QUESTIONS,questionIndex:0,endsAt:room.endsAt});emitRoom(room);clearTimeout(room.timer);room.timer=setTimeout(()=>finishRoom(room),300250)});
 socket.on("answer",({id,questionIndex,answerIndex})=>{const room=rooms.get(String(id||"").toUpperCase());const p=room?.players.get(socket.id);if(!room||!p||!room.started)return;const q=QUESTIONS[Number(questionIndex)];if(!q||Number(questionIndex)!==room.questionIndex||p.lastQuestion===room.questionIndex)return;if(Date.now()>room.endsAt)return finishRoom(room);const correct=Number(answerIndex)===q.correct;if(correct)p.score+=3;p.lastQuestion=room.questionIndex;socket.emit("answer:result",{correct,score:p.score});if([...room.players.values()].every(pl=>pl.lastQuestion===room.questionIndex)){room.questionIndex++;if(room.questionIndex>=QUESTIONS.length)return finishRoom(room);for(const pl of room.players.values())pl.lastQuestion=-1;io.to(room.id).emit("game:question",{questionIndex:room.questionIndex});emitRoom(room)}});
 socket.on("disconnect",()=>{for(const [id,room] of rooms){if(room.players.has(socket.id)){room.players.delete(socket.id);if(room.hostId===socket.id){const next=room.players.values().next().value;if(next)room.hostId=next.id;else{clearTimeout(room.timer);rooms.delete(id);continue}}emitRoom(room)}}});
});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
server.listen(PORT,()=>console.log(`Desafío 4to C listo en puerto ${PORT}`));