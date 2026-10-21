import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TOTAL=25;
const sizes=[9,9,11,11,13,13,15,15,17,17,17,19,19,19,21,21,21,23,23,23,25,25,25,25,25];
type Point={x:number;y:number};
function generate(n:number,seed:number):number[][]{
 const g=Array.from({length:n},()=>Array(n).fill(1));
 let s=seed; const rnd=()=>{s=(s*9301+49297)%233280;return s/233280};
 const stack:Point[]=[{x:1,y:1}];g[1][1]=0;
 while(stack.length){const p=stack[stack.length-1],opts:Point[]=[];
  for(const [dx,dy] of [[0,-2],[2,0],[0,2],[-2,0]]){const x=p.x+dx,y=p.y+dy;if(x>0&&y>0&&x<n-1&&y<n-1&&g[y][x]===1)opts.push({x,y})}
  if(!opts.length){stack.pop();continue}
  const q=opts[Math.floor(rnd()*opts.length)];g[(p.y+q.y)/2][(p.x+q.x)/2]=0;g[q.y][q.x]=0;stack.push(q);
 }
 g[n-2][n-2]=0;return g;
}
function solve(g:number[][]):Point[]{const n=g.length,q:Point[]=[{x:1,y:1}],prev=new Map<string,Point|null>([['1,1',null]]);
 for(let i=0;i<q.length;i++){const p=q[i];if(p.x===n-2&&p.y===n-2)break;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,y=p.y+dy,k=`${x},${y}`;if(x>=0&&y>=0&&x<n&&y<n&&g[y][x]===0&&!prev.has(k)){prev.set(k,p);q.push({x,y})}}
 }
 let p:Point|null={x:n-2,y:n-2};const out:Point[]=[];while(p){out.push(p);p=prev.get(`${p.x},${p.y}`)??null}return out.reverse();
}
export default function Home(){
 const [level,setLevel]=useState(1),[maze,setMaze]=useState(()=>generate(9,154)),[player,setPlayer]=useState<Point>({x:1,y:1}),[moves,setMoves]=useState(0),[seconds,setSeconds]=useState(0),[completed,setCompleted]=useState<number[]>([]),[unlocked,setUnlocked]=useState(1),[won,setWon]=useState(false),[hint,setHint]=useState<Point[]>([]),[light,setLight]=useState(false);
 useEffect(()=>{if(won)return;const t=setInterval(()=>setSeconds(v=>v+1),1000);return()=>clearInterval(t)},[won,level]);
 const path=useMemo(()=>new Set(hint.map(p=>`${p.x},${p.y}`)),[hint]);
 const reset=(l=level)=>{const n=sizes[l-1];setLevel(l);setMaze(generate(n,l*137+17));setPlayer({x:1,y:1});setMoves(0);setSeconds(0);setWon(false);setHint([])};
 const move=(dx:number,dy:number)=>{if(won)return;const x=player.x+dx,y=player.y+dy;if(x<0||y<0||y>=maze.length||x>=maze.length||maze[y][x])return;setPlayer({x,y});setMoves(v=>v+1);setHint([]);if(x===maze.length-2&&y===maze.length-2){setWon(true);setCompleted(v=>v.includes(level)?v:[...v,level]);setUnlocked(v=>Math.max(v,Math.min(TOTAL,level+1)))}};
 useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>false);return()=>sub.remove()},[]);
 const bg=light?'#f0f4ff':'#0d1426',panel=light?'#ffffff':'#17223a',fg=light?'#17223a':'#f4f7ff';
 const cellSize=Math.min(340/maze.length,18);
 return <SafeAreaView style={[s.safe,{backgroundColor:bg}]}><ScrollView contentContainerStyle={s.container}>
  <Text style={s.logo}>🧭 🗺️</Text><Text style={[s.title,{color:fg}]}>متاهات المغامرة</Text><Text style={[s.subtitle,{color:light?'#58647b':'#aab8d4'}]}>اعثر على طريقك إلى الكنز عبر 25 مستوى!</Text>
  <View style={s.stats}>{[['المستوى',`${level} / ${TOTAL}`],['الحركات',String(moves)],['الوقت',`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`]].map(([a,b])=><View key={a} style={[s.stat,{backgroundColor:panel}]}><Text style={s.statLabel}>{a}</Text><Text style={[s.statValue,{color:fg}]}>{b}</Text></View>)}</View>
  <View style={[s.board,{backgroundColor:panel,padding:7}]}>{maze.map((row,y)=><View key={y} style={s.row}>{row.map((v,x)=>{const isPlayer=player.x===x&&player.y===y,isGoal=x===maze.length-2&&y===maze.length-2;return <View key={x} style={[s.cell,{width:cellSize,height:cellSize,backgroundColor:v?'#526991':isPlayer?'#8cebd6':isGoal?'#ffd166':path.has(`${x},${y}`)?'#f4b942':'#e8eefb'}]}>{isPlayer?<Text style={{fontSize:cellSize*.72}}>🧑‍🚀</Text>:isGoal?<Text style={{fontSize:cellSize*.72}}>🏆</Text>:null}</View>})}</View>)}</View>
  <View style={s.controls}><View style={s.controlRow}><View style={s.empty}/><Pressable style={s.arrow} onPress={()=>move(0,-1)}><Text style={s.arrowText}>▲</Text></Pressable><View style={s.empty}/></View><View style={s.controlRow}><Pressable style={s.arrow} onPress={()=>move(-1,0)}><Text style={s.arrowText}>◀</Text></Pressable><Pressable style={s.arrow} onPress={()=>move(0,1)}><Text style={s.arrowText}>▼</Text></Pressable><Pressable style={s.arrow} onPress={()=>move(1,0)}><Text style={s.arrowText}>▶</Text></Pressable></View></View>
  <View style={s.actions}><Pressable style={s.action} onPress={()=>reset()}><Text style={s.actionText}>↻ إعادة المستوى</Text></Pressable><Pressable style={s.action} onPress={()=>setHint(solve(maze).slice(1,7))}><Text style={s.actionText}>💡 تلميح</Text></Pressable><Pressable style={s.action} onPress={()=>setLight(v=>!v)}><Text style={s.actionText}>☀️ / 🌙</Text></Pressable></View>
  <View style={[s.message,{backgroundColor:panel}]}><Text style={{color:won?'#5ce1c0':fg,textAlign:'center',fontWeight:'700'}}>{won?(level===TOTAL?'🎉 أكملت جميع المستويات!':'🎉 أحسنت! وصلت إلى الكنز!'): 'حرّك 🧑‍🚀 إلى 🏆 باستخدام أزرار الاتجاه.'}</Text>{won&&level<TOTAL?<Pressable style={s.next} onPress={()=>reset(level+1)}><Text style={s.nextText}>المستوى التالي ←</Text></Pressable>:null}</View>
  <Text style={[s.section,{color:fg}]}>اختيار المستوى</Text><View style={s.levels}>{Array.from({length:TOTAL},(_,i)=>i+1).map(l=><Pressable key={l} disabled={l>unlocked} onPress={()=>reset(l)} style={[s.level,{backgroundColor:completed.includes(l)?'#176d62':'#293b5d',opacity:l>unlocked?.35:1,borderWidth:l===level?2:0,borderColor:'#ffd166'}]}><Text style={s.levelText}>{completed.includes(l)?'✓ ':''}{l}</Text></Pressable>)}</View>
  <Text style={s.footer}>تقدمك محفوظ أثناء اللعب على هذا الجهاز.</Text>
 </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1},container:{alignItems:'center',padding:16,paddingBottom:36},logo:{fontSize:35,marginTop:4},title:{fontSize:29,fontWeight:'900',textAlign:'center'},subtitle:{fontSize:14,marginTop:5,marginBottom:17,textAlign:'center'},stats:{width:'100%',flexDirection:'row',gap:8,marginBottom:12},stat:{flex:1,borderRadius:14,padding:10,alignItems:'center'},statLabel:{fontSize:12,color:'#9fb0d0'},statValue:{fontSize:17,fontWeight:'800',marginTop:3},board:{borderRadius:16,alignSelf:'center',maxWidth:'100%'},row:{flexDirection:'row',gap:1},cell:{alignItems:'center',justifyContent:'center',borderRadius:2},controls:{marginTop:16,gap:7},controlRow:{flexDirection:'row',justifyContent:'center',gap:7},empty:{width:62,height:49},arrow:{width:62,height:49,backgroundColor:'#293b5d',borderRadius:12,alignItems:'center',justifyContent:'center'},arrowText:{fontSize:21,color:'white'},actions:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:8,marginTop:14},action:{backgroundColor:'#293b5d',paddingHorizontal:13,paddingVertical:11,borderRadius:11},actionText:{color:'white',fontWeight:'700'},message:{width:'100%',padding:14,borderRadius:13,marginTop:14},next:{alignSelf:'center',marginTop:12,backgroundColor:'#5ce1c0',padding:10,borderRadius:9},nextText:{fontWeight:'900',color:'#073d35'},section:{alignSelf:'stretch',fontSize:18,fontWeight:'800',marginTop:18,marginBottom:9},levels:{width:'100%',flexDirection:'row',flexWrap:'wrap',gap:7,justifyContent:'center'},level:{width:'17%',minWidth:48,maxWidth:62,paddingVertical:10,borderRadius:10,alignItems:'center'},levelText:{color:'white',fontWeight:'800'},footer:{color:'#8292b2',fontSize:12,textAlign:'center',marginTop:18}});
