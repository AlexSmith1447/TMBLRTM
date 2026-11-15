import assert from "node:assert/strict";
import {buildPostGraph,chooseGraphTopics,relatedBlogs,buildDiscoveryJobs,DEFAULT_TOPICS} from "../src/graphDiscovery.js";

const items=[
 {id:"a",blog:"artistpage",tags:["watercolor","painting","nature"],date:"2012-04-12",reblogFrom:"originalartist"},
 {id:"b",blog:"friendpage",tags:["watercolor","painting","flowers"],date:"2012-03-12",reblogFrom:"artistpage"},
 {id:"c",blog:"techpage",tags:["electronics","circuits","programming"],date:"2012-02-12"}
];
const liked={"a":items[0]},followed=["friendpage"];
const graph=buildPostGraph(items,{liked,followed});
const topics=chooseGraphTopics(graph,0,4);
assert.ok(topics.includes("watercolor"),"followed/liked post topic should inform discovery");
assert.ok(topics.includes("painting"),"linked tags should be followed");
const blogs=relatedBlogs(graph,followed,0,8);
assert.ok(blogs.some(x=>x.name==="originalartist"),"real reblog origin is a valid candidate");
assert.ok(!blogs.some(x=>x.name==="friendpage"),"followed blogs should not be recommended again");
const anchors=(date,months)=>months.map(i=>Math.floor(Date.parse(date+"T23:59:59Z")/1000)-i*31*86400);
const {jobs}=buildDiscoveryJobs({posts:items,liked,followed,rotation:0,page:0,date:"2012-12-31",anchors});
assert.ok(jobs.some(x=>x.tag==="watercolor"));
assert.ok(jobs.some(x=>x.blog==="originalartist"),"blog discovery should become a real API lookup");
assert.ok(jobs.every(x=>x.tag||x.blog));
assert.ok(jobs.length<=9,"avoid excessive Tumblr API requests");
const empty=chooseGraphTopics(buildPostGraph([],{}),0,4);
assert.ok(empty.length===4&&empty.every(t=>DEFAULT_TOPICS.includes(t)),"cold start should not invent narrow user interests");
assert.ok(!empty.includes("creepypasta"),"cold start should not force the old nostalgia list");
console.log("Graph discovery tests passed: linked tags, real reblog bloggers, cold start and API request limit");
