from pathlib import Path
import re,json,shutil
root=Path(__file__).parent
src=root/'original-manuscript.txt'
raw=src.read_text(encoding='utf-8')
parts=list(re.finditer(r'(?m)^## Part (\d+)\s*$',raw))
chapters=[]
for i,m in enumerate(parts):
    content=raw[m.end():parts[i+1].start() if i+1<len(parts) else len(raw)].strip()
    # These are prompt metadata, not the narrative. Preserve the original separately.
    mm=re.match(r'(?s)^BRIEF\s*\n.*?\nTEXT\s*\n',content)
    if mm: content=content[mm.end():].strip()
    paras=[p.strip() for p in re.split(r'\n\s*\n',content) if p.strip()]
    # Avoid inserting artificial material or repairing incomplete source passages.
    words=sum(len(p.split()) for p in paras)
    chapters.append({'id':int(m.group(1)),'title':f'Part {m.group(1)}', 'words':words,
       'preview':re.sub(r'\s+',' ',paras[0])[:210] if paras else '', 'paragraphs':paras})
book={'title':'The History of War and the Development of Weapons','subtitle':'An illustrated listening library','source':'User-provided manuscript; original wording preserved','chapters':chapters}
(root/'book.json').write_text(json.dumps(book,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
# The unmodified original source stays in original-manuscript.txt
# Voice names and ids transcribed from the Gradium official voice-catalog publication.
voice_groups=[
 ('en','en-us','female','''Zoey|NbpkqMVS3CJeq2j8;Juniper|NIWIOv5vTi5eRMj8;Everly|vjFyp2BcCyTlUmYb;Harper|4SZHfMpw-p46Ywgs;Hadley|bXwrkHhURL1VFJdG;Delia|nGzMHMPAWGaJFHOo'''),
 ('en','en-us','male','''Easton|LMDIYE0Oa377Qh6Z;Micah|40QrMVgAxFiUnP9f;Trevor|0zLApsZfVLLNaEGl;Russell|_6Aslh2DxfmnRLmP;Preston|qIxlZ7Ei8KvWlyQH;Miles|d9XCyhjo4JhkHF1d'''),
 ('en','en-gb','female','''Maeve|6PWnV0Nq4wu7RVBT;Freya|GgfEkEJtxZR7gnpy;Pippa|uem82D50GRv2Dwma;Elodie-Rose|y9bQqIDnyxwqK01t;Imogen|gDT1nz7Ie36ZhL-C;Lottie|m9MxpY6IUGXtWp76;Bryony|gfP44RlHwr2kEwk7'''),
 ('en','en-gb','male','''Alfie|X6NceqF285Gr04gb;Hugh|YyKcxPG7iIgS3jsK;Edwin|zUCxzrOrugTSis03;Spencer|JOW0vchyswkQUMDS;Toby|dME3IWyZBvmh1n1q;Teddy|Zn7g6NxLqXlJb7Qi'''),
 ('fr','fr-fr','female','''Noémie|FXxJ9mANRq6BCTX5;Coralie|ZeSg853xFACESHHI;Tiphaine|0fvH6XAKvA748v2v;Maëlys|s048cR1l2Jmu4k3B;Orianne|TUk4X11S6UytB3G6;Solène|YhIHaAfQ0cQPDV9R;Ninon|qtPlUYAZ4EJDuWMm;Lilou|4iKxBtHBRzr1YOph;Hélène|Vvakv7iWZCUrBooR'''),
 ('fr','fr-fr','male','''Augustin|Tek4tJXiX6_yvXq7;Arnaud|aXMVwiUhITMrwPzd;Jules|YKeBw3OV1RgpdhLh;Baptiste|rqqeErpASHVQXHDd;Lucien|LIv4NaG8ay4Mhqtd;Marius|biuhvu17TxVKOcyy'''),
 ('de','de-de','female','''Nele|2A2fFf8SkDEJ8nzx;Jette|4Mn9VfG2wsLLEzi5;Annika|p6Uutkyi3j2iNAUu;Jule|MxhgvuHuUER7qjmL;Lotta|MOrDPn052KUlnKXk;Josefine|yadpmqsHVrYC0NJp;Svea|Adoh4wA9tp5QXJi9'''),
 ('de','de-de','male','''Anton|3ZKKapPOvuWFcw9f;Mirko|Xn9xDzqSSr4xGTNg;Mats|Kf5m22mROozoMWj3;Henrik|yyS1KYWs6mXoEw7D;Leon|20zdyYrQPzKlCwkk;Mika|R3uU1GTAZJotUhUs'''),
 ('es','es-es','female','''Noa|b6FvJAiokjdqIti4;Lucía-Sol|3p0eIGbkmny71GlA;Candela|c9wqBDmQiBie5q6Y;Celia|rmLBOdHrfkFym9MM;Alba|u2UscyAnHilpiwmf;Alicia|4701YgRXjkBcg6sL;Nerea|EQcQFGkYfMn5YJgx'''),
 ('es','es-es','male','''Marcos|jvPx8j8zLGQ3utZz;Borja|tIjCgP8v3RY8UpgM;Iker|t-_TS1e-0GzDAX02;Nuno|fghJGlv90qu8OJ36;Izan|Ejb29qHnSOK0cIHY;Guillermo|FaLVVqpFQcDOtq45'''),
 ('es','es-mx','female','''Rebeca|Sx8m6WdXBG06zwZT;Regina|s58clrg2fe0MO7Y-;Danae|evfxKSxpDIhmsNoq;Azucena|KJpIQlbYrZPA4aLq;Jimena|qG5BXOJYrKEnXLIX;Ximena|VDwnGxAo68C8U8vC'''),
 ('es','es-mx','male','''Lalo|F05gqkzX7WhKVpSL;Aldo|ax7dW1XB0eiMfHgO;Yael|ALczEazoF4n6PmGl;Ulises|G5HLUsQd659UtRe7;Leonel|BkuASiOJRrJEB5qA;Nico|PwgPEaweQILZdGc4'''),
 ('pt','pt-br','female','''Manuela-Lu|KgC2Nqnjj48NUiyV;Isadora|CtNvKUUMrx1h56ih;Débora|K8mj96kYHMy8q3Hb;Rafaela|6k6cRt7QJfm5ChrH;Clarice|sGCMzFIA53ppIngM;Flávia|gOc90Rjmv5CobHCj'''),
 ('pt','pt-br','male','''Davi|NuUr_x5V90hSHzCJ;Igor|l7520SIXi14iEamd;Kauã|6HftnVU1XqVBJS8t;Vitor|mWgyMRkFED70QxQv;Otávio|JYtmeaysoaR0Wybf;Marcelo|qDeAnE4L4bk0BRz1'''),
 ('en','characters','character','''Captain Silas Blackwater|xPDpsV3F592srkjA;Morwenna of the Deep|nOykTmcH9ydsGGIc;Old Mortlake|lX3LavMNdlIbgEHH;Azgorath|dGyGDKo2osj7h3s7;Fennick the Young Elf|cXoIXJ2llS8S0WOW;The Thing Under the Stairs|GXaSqMEmOg12OIYb;Vyrmathrax the Ancient|xO8xQo3BrB8FuI6J;Grub the Ogre|cYtsRSxV5q9IMehn;Master Aldric|gSgG5Tor0GPEnqzC;The Snow Queen|NIWoEurJHMJjyUTe;Sir Bramwell|y2eiKxtQo2B67deU;Fairy Godmother|QXNr0SvkukLB4wPq'''),
]
voices=[]
for lang,locale,gender,data in voice_groups:
    for rank,pair in enumerate(data.split(';'),1):
        name,vid=pair.split('|')
        slug=(name.casefold().replace('ł','l'))
        import unicodedata
        slug=''.join(c for c in unicodedata.normalize('NFD',slug) if unicodedata.category(c)!='Mn').replace(' ','_').replace('-','_')
        if gender=='character':
            sample=f'samples/en/characters/{slug}_{vid}.ogg'
        else:
            sample=f'samples/{lang}/{locale}/{gender}/{rank}_{slug}_{vid}.ogg'
        voices.append(dict(name=name,id=vid,lang=lang,locale=locale,gender=gender,rank=rank, sample=sample, file=f'voices/{vid}.safetensors'))
assert len(voices)==102,len(voices)
(root/'voices.json').write_text(json.dumps({'catalog':'gradium/phonon-voices','count':len(voices),'voices':voices},ensure_ascii=False,indent=2),encoding='utf-8')
print('PARTS',len(chapters),'words',sum(c['words'] for c in chapters),'voices',len(voices),'book size', (root/'book.json').stat().st_size)
