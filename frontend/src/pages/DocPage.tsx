import { useState, useRef, useEffect } from "react";
import { App, Button } from "antd";
import {
  BlockOutlined,
  AimOutlined,
  PartitionOutlined,
  ClusterOutlined,
  FormOutlined,
  ApartmentOutlined,
  BuildOutlined,
  ProfileOutlined,
  DeploymentUnitOutlined,
  CopyOutlined,
  DownloadOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { PortalSidebar } from "@/components/layout/PortalSidebar";
import {
  SmartSidebar,
  type SidebarSchema,
  type SchemaField,
} from "@/components/SmartSidebar";
import { useParams } from "react-router-dom";
import { getDocument, saveDocument } from "@/api/document";
import { useReactToPrint } from "react-to-print";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; // 支持表格、中划线等
import { useTranslation } from "react-i18next";

export const DocPage = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(Boolean(id));
  // 🌟 只存标题和 Markdown 正文
  const [docData, setDocData] = useState<{
    title: string;
    markdownContent: string;
  } | null>(null);
  const [historyFormValues, setHistoryFormValues] = useState<any>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const formFields: SchemaField[] = [
    {
      name: "docType",
      label: t("O3lW7GA0P-29WSOC79z4s"),
      type: "select",
      placeholder: t("IeuYDSfa4a16iCUpkCX4n"), // 🚀 新增
      options: [
        { label: t("CLz9ayEhi1_W7diFk9Dci"), value: "0" },
        { label: t("UkrqIKSlFb-yYHCNPeoKC"), value: "1" },
        { label: t("3tDSz4-nfMFQDmLdK_1I0"), value: "2" },
        { label: t("dvji6mpyXI-zm3GFxZ3wJ"), value: "3" },
        { label: t("Gbfu7J2vR3GcTsqb9Eq8A"), value: "4" },
        { label: t("9ExzHanpbBUmWRpvUu4-j"), value: "5" },
        { label: t("YJZLOi3212XFt5zAOJUvx"), value: "8" },
        { label: t("GOAkpRo2e5RLaffi1zO1I"), value: "9" },
      ],
    },
    {
      name: "content",
      label: t("2PA2wuQkr2YQ_r2W-Mp8S"),
      type: "textarea",
      maxLength: 1000,
      minRows: 10,
      maxRows: 18,
      // 🚀 新增：引导用户输入时间、地点、事件经过和诉求
      placeholder: t("FLOQLls0LWj91JvI_65tn"),
    },
    {
      name: "partyA",
      label: t("3Ciew_RfVQBCLYEuoubMA"),
      type: "textarea",
      maxLength: 100,
      // 🚀 新增：提示标准的身份要素
      placeholder: t("9QScDxuO43b-aylXttgio"),
    },
    {
      name: "partyB",
      label: t("CccrIZftBpy9Pp3TumH2U"),
      type: "textarea",
      maxLength: 100,
      // 🚀 新增：提示标准的身份要素
      placeholder: t("hIKILc_dVjVipLHKKSAIQ"),
    },
  ];

  const docSchema: SidebarSchema = {
    title: t("oyui4_Zm6W2vEYCn7Gw3T"),
    submitText: t("D44eZM-z5xabv94vnapBw"),
    submitHint: t("GjNFCNGzRHYllP1yiRkkz"),
    hasSceneSwitch: true, // 开启场景切换逻辑
    categories: [
      {
        id: "civil_lawsuit",
        title: t("pZG3HWwoUi_2FNM0-XJLG"),
        description: t("br3gSnrLbTzuZm7z2vOHI"),
        icon: <BlockOutlined />,
        formFields,
      },
      {
        id: "civil_defense",
        title: t("014CHY3Fzw5q_meNNYzht"),
        description: t("FF1nlJ5KmY42QiYDvlwPa"),
        icon: <AimOutlined />,
        formFields,
      },
      {
        id: "property_evidence",
        title: t("0QhqHWkQPX_FSZge52sFv"),
        description: t("c9VlT4QbER-13OVsL48rV"),
        icon: <PartitionOutlined />,
        formFields,
      },
      {
        id: "labor_contract",
        title: t("-53FdczzsCVuhoCMrOAiF"),
        description: t("xh8cMb3JMB9Vy2R4HuzBZ"),
        icon: <ClusterOutlined />,
        formFields,
      },
      {
        id: "commercial_contract",
        title: t("rKyONUfIHLRFphguByAqC"),
        description: t("hNKDJ6pkRPsV9_iOtQkL1"),
        icon: <FormOutlined />,
        formFields,
      },
      {
        id: "civil_life_contract",
        title: t("5MQH81eDckRvzfiupAwqI"),
        description: t("ykpT12Fo8GoHBQuMtaF9D"),
        icon: <ApartmentOutlined />,
        formFields,
      },
      {
        id: "marriage_family_agreement",
        title: t("9lWi3DFaW1k_dMyPircOl"),
        description: t("Ou7hKe9L5uDMcO8VAICfE"),
        icon: <BuildOutlined />,
        formFields,
      },
      {
        id: "labor_arbitration",
        title: t("L8fLLN3IBKkidwcjLy3Lt"),
        description: t("EH6Wz6kR6Nq_oMVCzy_Bg"),
        icon: <ProfileOutlined />,
        formFields,
      },
      {
        id: "administrative_document",
        title: t("-dE1F8eJXwMTGwUV_DssC"),
        description: t("7zPo9FqWqA9AzrBxDJKwe"),
        icon: <DeploymentUnitOutlined />,
        formFields,
      },
    ],
  };

  // 🚀 4. 核心逻辑：当页面加载，或者 URL 的 id 发生变化时触发
  useEffect(() => {
    if (id) {
      // 场景 A：带有 ID，说明是从“历史记录”点进来的
      fetchHistoryData(id);
    } else {
      // 场景 B：没有 ID，说明是点击“新建文书”进来的，清空所有状态
      setDocData(null);
      setHistoryFormValues(null);
    }
  }, [id]);

  // 模拟从后端拉取历史数据的函数
  const fetchHistoryData = async (documentId: string) => {
    console.log(documentId);
    setLoading(true);
    try {
      // 真实请求：const res = await request.get(`/document/${documentId}`)

      // 模拟接口返回的数据 (包含了当时填写的表单，以及最终生成的 Markdown)
      setTimeout(() => {
        const mockResponse = {
          formValues: {
            docType: "civil_lawsuit",
            partyA: t("laz3PlMuN89E-5OcyTzxg"),
            partyB: t("frG8K_c4MQwo1P3EpXezw"),
            content: t("Qr856kk16HrEEhMLKfuvB"),
          },
          generatedResult: {
            title: t("pZG3HWwoUi_2FNM0-XJLG"),
            markdownContent: t("2KsLZMQlIAeeyte4pRN69"),
          },
        };

        // 把数据分别喂给左侧表单和右侧 A4 纸
        setHistoryFormValues(mockResponse.formValues);
        setDocData(mockResponse.generatedResult);
        setLoading(false);
      }, 800); // 模拟一个极快的历史记录拉取时间
    } catch (error) {
      message.error(t("7gEeqjRG-8JBLFMo_Ol_G"));
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      // 1. 调用生成接口
      const res = await getDocument(values);

      if (res.code === 0 || res.code === 200) {
        setDocData(res.data);

        // ==========================================
        // 🚀 2. 异步保存到历史记录
        // ==========================================
        try {
          // 根据要求进行字段映射
          const savePayload = {
            senseId: values.category || values.categoryId, // 视你 SmartSidebar 传出的字段名为准（通常是 category）
            typeId: values.docType,
            partyA: values.partyA,
            partyB: values.partyB,
            content: values.content,
            // 💡 架构师提示：如果后端还需要保存生成的 Markdown 结果，你可以在这里追加：
            result: res.data.markdownContent,
          };

          await saveDocument(savePayload);
          console.log("✅ 历史记录保存成功", savePayload);
        } catch (saveError) {
          console.error("❌ 保存历史记录失败:", saveError);
          // 这里通常只打日志，不 return，因为文书已经生成成功了，不要打断用户的核心体验
        }

        message.success(t("LjfQMB20IjwkMwQ1St3tT"));
      } else {
        message.error(res.message || t("N8Q9CFlJEM7-6QQ0LXcaG"));
      }
    } catch (error) {
      console.error("文书生成请求异常:", error);
      message.error(t("w78_GpuwYhHX8r7ssNAwH"));
    } finally {
      setLoading(false);
    }
  };

  // 复制纯文本 (提取渲染后的文本，而不是带有 # 的源码，更适合用户粘贴到 Word)
  const handleCopy = () => {
    if (!paperRef.current) return;
    const textToCopy = paperRef.current.innerText;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => message.success(t("pK7S2o5NXlBVx9ouR0faR")))
      .catch(() => message.error(t("w8mZWy1TYZfrI-B-fKlnW")));
  };

  // 🌟 终极解决方案：使用 react-to-print
  const handleDownloadPDF = useReactToPrint({
    contentRef: paperRef, // 只打印这个 ref 包裹的内容
    documentTitle: docData?.title || t("mMn_ySGuShQh_PuWdR-LB"), // 导出的默认文件名
    onAfterPrint: () => message.success(t("iOG-eFwD9sUZjVmAn0-1G")),
  });

  return (
    <div className="flex h-full bg-gray-50">
      <PortalSidebar>
        <SmartSidebar
          schema={docSchema}
          onSubmit={handleSubmit}
          isLoading={loading} // 如果你的组件支持 loading 属性
          initialValues={historyFormValues}
        />
      </PortalSidebar>

      {/* 右侧预览区 */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center relative">
        {loading && (
          <div className="flex flex-col h-full items-center justify-center text-center animate-fade-in">
            {/* 🚀 2. 替换为 Antd 的 BulbOutlined，加上呼吸灯动画 */}
            <div className="mb-6">
              <BulbOutlined className="text-[80px] text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-wide mb-2">
              {t("DlyDIpTbRIY_ZZ2Ol8T4M")}{" "}
            </h2>
            <p className="text-[15px] text-gray-500">
              {t("NeYml9t4SpB1yGU3t8r87")}
            </p>
          </div>
        )}
        {!docData && !loading && (
          <div className="flex h-full items-center justify-center text-gray-400">
            {t("VX9R6K8IPuw845fJu14ZQ")}{" "}
          </div>
        )}
        {docData && !loading && (
          <div className="w-full h-full flex flex-col gap-6 max-w-4xl">
            {/* 🌟 A4 纸张容器 */}
            <div
              id="legal-document-paper"
              ref={paperRef}
              className="flex-1 bg-white shadow-lg rounded-sm p-12 text-gray-800 overflow-y-scroll custom-scrollbar animate-fade-in"
            >
              {/* 使用 Tailwind 排版类名模拟 Markdown 样式。
                注意：这里对 h1, h2, p, strong 进行了底层的样式覆盖，
                以确保它看起来像一份严肃的法律文件。
              */}
              <div
                className="
                prose prose-slate max-w-none 
                prose-h1:text-3xl prose-h1:text-center prose-h1:tracking-widest prose-h1:mb-8
                prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2
                prose-p:leading-relaxed prose-p:mb-4 prose-p:indent-8
                prose-li:my-1
                prose-strong:text-black prose-strong:font-bold
              "
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {docData.markdownContent}
                </ReactMarkdown>
              </div>
            </div>

            {/* 悬浮操作按钮 */}
            <div className="flex gap-4 m-auto">
              <Button
                type="primary"
                icon={<CopyOutlined />}
                onClick={handleCopy}
              >
                {t("qxEoDfJTtO8dsJnMzfqyg")}{" "}
              </Button>
              <Button
                className="bg-green-600 text-white hover:bg-green-500 border-none"
                icon={<DownloadOutlined />}
                onClick={handleDownloadPDF}
              >
                {t("uCa1Y6ndA6Wjk80c2DdMt")}{" "}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocPage;
