'use strict';
(()=>{
  const container=document.getElementById('informationStories');
  const dialog=document.getElementById('infoDetail');
  const content=document.getElementById('infoDetailContent');
  if(!container||!dialog||!content)return;
  const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeURL=value=>{if(!value)return '';try{const u=new URL(value,location.href);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return ''}};
  const publicImage=value=>{if(!value)return '';if(/^https?:\/\//i.test(value))return value;return safeURL(value)};
  function bodyHTML(text){
    const lines=String(text||'').replace(/\r/g,'').split('\n');let html='',paragraph=[],list=[];
    const flushParagraph=()=>{if(paragraph.length){html+=`<p>${paragraph.map(escapeHTML).join('<br>')}</p>`;paragraph=[]}};
    const flushList=()=>{if(list.length){html+=`<ul>${list.map(item=>`<li>${escapeHTML(item)}</li>`).join('')}</ul>`;list=[]}};
    for(const raw of lines){const line=raw.trimEnd();if(!line.trim()){flushParagraph();flushList();continue}if(/^##\s+/.test(line)){flushParagraph();flushList();html+=`<h3>${escapeHTML(line.replace(/^##\s+/,''))}</h3>`;continue}if(/^>\s?/.test(line)){flushParagraph();flushList();html+=`<blockquote>${escapeHTML(line.replace(/^>\s?/,''))}</blockquote>`;continue}if(/^-\s+/.test(line)){flushParagraph();list.push(line.replace(/^-\s+/,''));continue}flushList();paragraph.push(line)}flushParagraph();flushList();return html;
  }
  function galleryHTML(item){const urls=[item.image,...(Array.isArray(item.gallery)?item.gallery:[])].map(publicImage).filter((url,index,list)=>url&&list.indexOf(url)===index);if(!urls.length)return '';return `<div class="detail-gallery">${urls.map((url,index)=>`<img class="detail-image" src="${escapeHTML(url)}" alt="${escapeHTML(item.title)} 사진 ${index+1}" loading="${index?'lazy':'eager'}" decoding="async">`).join('')}</div>`}
  function openArticle(item){const source=safeURL(item.source_url);content.innerHTML=`${galleryHTML(item)}<div class="info-article-head"><p class="card-meta"><span>${escapeHTML(item.section||'INFORMATION')}</span>${item.published_at?`<span>· ${escapeHTML(item.published_at)}</span>`:''}</p><h2 id="infoDetailTitle">${escapeHTML(item.title)}</h2>${item.subtitle?`<p class="info-article-subtitle">${escapeHTML(item.subtitle)}</p>`:''}</div><div class="info-body">${bodyHTML(item.body)}</div>${source?`<a class="detail-source" href="${escapeHTML(source)}" target="_blank" rel="noopener noreferrer">참고 / 원문 보기 ↗</a>`:''}`;dialog.showModal()}
  function render(items){container.replaceChildren();if(!items.length){container.hidden=true;return}container.hidden=false;for(const item of items){const article=document.createElement('article');article.className=`info-story ${['feature','standard','compact'].includes(item.layout)?item.layout:'standard'}`;const button=document.createElement('button');button.type='button';button.className='info-story-button';const image=publicImage(item.image);button.innerHTML=`${image?`<img class="info-story-image" src="${escapeHTML(image)}" alt="${escapeHTML(item.title)}" loading="lazy" decoding="async">`:''}<p class="info-story-meta"><span>${escapeHTML(item.section||'INFORMATION')}</span>${item.published_at?`<span>· ${escapeHTML(item.published_at)}</span>`:''}</p><h3>${escapeHTML(item.title)}</h3>${item.subtitle?`<p>${escapeHTML(item.subtitle)}</p>`:''}`;button.addEventListener('click',()=>openArticle(item));article.append(button);container.append(article)}}
  dialog.querySelector('.close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}});
  fetch('data/information.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('fetch');return r.json()}).then(data=>render((Array.isArray(data.items)?data.items:[]).filter(item=>item.visible!==false))).catch(()=>{container.hidden=true});
})();
