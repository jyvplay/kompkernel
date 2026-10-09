import { countTokens, tokenStrings } from '../src/lib/omega/bpe';
const T=(s:string)=>countTokens(s,'o200k_base');
// Same meaning, 9 languages. Hand-written, not fetched, so the content is matched.
const S: Record<string,string> = {
en:"The retention policy determines how long the system keeps a document before it becomes eligible for permanent deletion. Every document inherits exactly one policy, resolved at the moment the document is created. Changing a policy later affects only documents created after the change.",
es:"La política de retención determina durante cuánto tiempo el sistema conserva un documento antes de que sea elegible para su eliminación permanente. Cada documento hereda exactamente una política, resuelta en el momento en que se crea el documento. Cambiar una política más tarde afecta únicamente a los documentos creados después del cambio.",
fr:"La politique de conservation détermine combien de temps le système conserve un document avant qu'il ne devienne éligible à une suppression définitive. Chaque document hérite d'exactement une politique, résolue au moment où le document est créé. Modifier une politique ultérieurement n'affecte que les documents créés après la modification.",
de:"Die Aufbewahrungsrichtlinie bestimmt, wie lange das System ein Dokument aufbewahrt, bevor es für die dauerhafte Löschung infrage kommt. Jedes Dokument erbt genau eine Richtlinie, die im Moment der Dokumenterstellung aufgelöst wird. Eine spätere Änderung der Richtlinie betrifft nur Dokumente, die nach der Änderung erstellt wurden.",
pt:"A política de retenção determina por quanto tempo o sistema mantém um documento antes de ele se tornar elegível para exclusão permanente. Cada documento herda exatamente uma política, resolvida no momento em que o documento é criado. Alterar uma política posteriormente afeta apenas os documentos criados após a alteração.",
it:"La politica di conservazione determina per quanto tempo il sistema conserva un documento prima che diventi idoneo alla cancellazione permanente. Ogni documento eredita esattamente una politica, risolta nel momento in cui il documento viene creato. Modificare una politica successivamente influisce solo sui documenti creati dopo la modifica.",
pl:"Zasada przechowywania określa, jak długo system przechowuje dokument, zanim stanie się on kwalifikowalny do trwałego usunięcia. Każdy dokument dziedziczy dokładnie jedną zasadę, rozstrzyganą w chwili utworzenia dokumentu. Późniejsza zmiana zasady dotyczy wyłącznie dokumentów utworzonych po tej zmianie.",
tr:"Saklama politikası, sistemin bir belgeyi kalıcı olarak silinmeye uygun hale gelmeden önce ne kadar süre saklayacağını belirler. Her belge tam olarak bir politikayı devralır ve bu politika belgenin oluşturulduğu anda çözümlenir. Bir politikanın daha sonra değiştirilmesi yalnızca değişiklikten sonra oluşturulan belgeleri etkiler.",
vi:"Chính sách lưu trữ xác định hệ thống giữ một tài liệu trong bao lâu trước khi tài liệu đó đủ điều kiện để xóa vĩnh viễn. Mỗi tài liệu kế thừa chính xác một chính sách, được xác định tại thời điểm tài liệu được tạo. Việc thay đổi chính sách sau này chỉ ảnh hưởng đến các tài liệu được tạo sau khi thay đổi.",
ru:"Политика хранения определяет, как долго система хранит документ, прежде чем он станет пригодным для окончательного удаления. Каждый документ наследует ровно одну политику, которая определяется в момент создания документа. Последующее изменение политики затрагивает только документы, созданные после изменения.",
zh:"保留策略决定系统在文档符合永久删除条件之前保留该文档的时长。每个文档恰好继承一项策略，并在文档创建时解析该策略。之后更改策略仅影响在更改之后创建的文档。",
ja:"保持ポリシーは、ドキュメントが完全削除の対象となるまでシステムがそのドキュメントを保持する期間を決定します。各ドキュメントはちょうど一つのポリシーを継承し、ドキュメントの作成時点で解決されます。後からポリシーを変更しても、変更後に作成されたドキュメントにのみ影響します。",
ko:"보존 정책은 문서가 영구 삭제 대상이 되기 전까지 시스템이 해당 문서를 보관하는 기간을 결정합니다. 모든 문서는 정확히 하나의 정책을 상속하며, 해당 정책은 문서가 생성되는 시점에 확정됩니다. 이후 정책을 변경하더라도 변경 이후에 생성된 문서에만 적용됩니다.",
ar:"تحدد سياسة الاحتفاظ المدة التي يحتفظ فيها النظام بالمستند قبل أن يصبح مؤهلاً للحذف الدائم. يرث كل مستند سياسة واحدة بالضبط، يتم تحديدها في لحظة إنشاء المستند. ولا يؤثر تغيير السياسة لاحقاً إلا على المستندات التي أُنشئت بعد التغيير.",
hi:"प्रतिधारण नीति यह निर्धारित करती है कि सिस्टम किसी दस्तावेज़ को स्थायी रूप से हटाने के योग्य होने से पहले कितने समय तक रखता है। प्रत्येक दस्तावेज़ ठीक एक नीति प्राप्त करता है, जो दस्तावेज़ बनाए जाने के क्षण में तय होती है। बाद में नीति बदलने से केवल परिवर्तन के बाद बनाए गए दस्तावेज़ प्रभावित होते हैं।",
};
const base=T(S.en);
console.log('lang  chars  tokens  chars/tok   vs EN   cost multiple');
for(const [k,v] of Object.entries(S)){
  const t=T(v);
  console.log(k.padEnd(5), String(v.length).padStart(6), String(t).padStart(7), (v.length/t).toFixed(2).padStart(10), String(t-base).padStart(7), (t/base).toFixed(2).padStart(14));
}
console.log('\n=== where do the tokens go in fr/de/pl/vi? (fragments per word) ===');
for(const k of ['en','fr','de','pl','tr','vi','ru','hi']){
  const words=(S[k].match(/\S+/g)??[]);
  const multi=words.filter(w=>T(' '+w)>1);
  const tot=words.reduce((a,w)=>a+T(' '+w),0);
  console.log(k.padEnd(4),'words',String(words.length).padStart(4),'tok',String(tot).padStart(4),'tok/word',(tot/words.length).toFixed(2),'words>1tok',String(multi.length).padStart(4),
    ' worst:', multi.sort((a,b)=>T(' '+b)-T(' '+a)).slice(0,5).map(w=>`${w}(${T(' '+w)})`).join(' '));
}
