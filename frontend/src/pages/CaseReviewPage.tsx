import { useState, useRef, useEffect } from "react";
import { Button, App } from "antd";
import {
  CopyOutlined,
  DownloadOutlined,
  ReadOutlined,
} from "@ant-design/icons";
import { PortalSidebar } from "@/components/layout/PortalSidebar";
import { SmartSidebar, type SidebarSchema } from "@/components/SmartSidebar";
import { useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";

// 🚀 1. 引入我们刚刚建好的 API
import { analyzeCaseSummaryApi } from "@/api/case-review";

export const CaseReviewPage = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(Boolean(id));
  const [docData, setDocData] = useState<{
    title: string;
    markdownContent: string;
  } | null>(null);
  const [historyFormValues, setHistoryFormValues] = useState<any>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  // 侧边栏配置
  const caseReviewSchema: SidebarSchema = {
    title: t("v62oh91W_duc1Jbd_i6fQ"),
    submitText: t("8PdBQnDRgcna1nxeZQ7pK"),
    submitHint: t("GjNFCNGzRHYllP1yiRkkz"),
    hasSceneSwitch: false,
    categories: [
      {
        id: "case_summary",
        title: "",
        formFields: [
          {
            name: "caseMaterials",
            label: t("CfvXKNS6uT356fQdH4wOX"),
            type: "upload-dragger",
            required: true,
            placeholder: t("sOvH8SmlQgTNc7gyc3AT8"),
          },
          // 🚀 2. 补上我们后端 DTO 里预留的 remarks 字段！体验拉满！
          {
            name: "remarks",
            label: t("6XlGndpsx3PcbGwtIhpGj"),
            type: "textarea",
            placeholder: t("zQknia65JY5tLf6iJ2jrB"),
            maxLength: 500,
          },
        ],
      },
    ],
  };

  useEffect(() => {
    if (id) {
      fetchHistoryData(id);
    } else {
      setDocData(null);
      setHistoryFormValues(null);
    }
  }, [id]);

  // 历史记录拉取（目前保留 mock，后续对接历史接口）
  const fetchHistoryData = async (documentId: string) => {
    setLoading(true);
    try {
      setTimeout(() => {
        const mockResponse = {
          formValues: {
            caseMaterials: [],
            remarks: "",
          },
          generatedResult: {
            title: t("YUqcb6d7cVYM5q7ehJ2N5"),
            markdownContent: t("fifiGN79-dqGLF1GfC16u"),
          },
        };
        setHistoryFormValues(mockResponse.formValues);
        setDocData(mockResponse.generatedResult);
        setLoading(false);
      }, 800);
    } catch (error) {
      console.error(error);
      message.error(t("7gEeqjRG-8JBLFMo_Ol_G"));
      setLoading(false);
    }
  };

  // 🚀 3. 重构提交逻辑：组装 FormData
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      // 创建 FormData 对象来携带文件
      const formData = new FormData();

      // 💡 关键：处理文件数组。兼容 Antd 的 fileList 结构，提取真实的 File 对象
      if (values.caseMaterials && values.caseMaterials.length > 0) {
        values.caseMaterials.forEach((fileItem: any) => {
          // Antd 的 Upload 组件会把真实文件挂载在 originFileObj 上
          const actualFile = fileItem.originFileObj || fileItem;
          // 注意：这里的 'files' 必须和后端 @UseInterceptors(FilesInterceptor('files')) 保持名字一模一样！
          formData.append("files", actualFile);
        });
      } else {
        message.warning(t("FA0VmOz2_D0D41lTmBu-m"));
        setLoading(false);
        return;
      }

      // 如果有补充说明，也塞进 formData
      if (values.remarks) {
        formData.append("remarks", values.remarks);
      }

      // 🚀 4. 发起真实请求
      const res = await analyzeCaseSummaryApi(formData);

      if (res.code === 0) {
        setDocData({
          title: t("YUqcb6d7cVYM5q7ehJ2N5"),
          markdownContent: res.data, // 渲染后端的 Markdown
        });
        message.success(t("EUMVx-oC3FlOfr1AavDFw"));
      } else {
        message.error(res.message || t("jVmLS0apaNTqcH-Lui9Bm"));
      }
    } catch (error) {
      // 网络级别的报错（401, 500 等）已经被全局拦截器提示过了
      console.error("案件快梳请求异常:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!paperRef.current) return;
    const textToCopy = paperRef.current.innerText;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => message.success(t("qtBB7I_ORtKSKPCky3qti")))
      .catch(() => message.error(t("w8mZWy1TYZfrI-B-fKlnW")));
  };

  const handleDownloadPDF = useReactToPrint({
    contentRef: paperRef,
    documentTitle: docData?.title || t("b9DTbn1y0rmyvUESYYEc3"),
    onAfterPrint: () => message.success(t("iOG-eFwD9sUZjVmAn0-1G")),
  });

  return (
    <div className="flex h-full bg-gray-50">
      <PortalSidebar>
        <SmartSidebar
          schema={caseReviewSchema}
          onSubmit={handleSubmit}
          isLoading={loading}
          initialValues={historyFormValues}
        />
      </PortalSidebar>

      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center relative">
        {loading && (
          <div className="flex flex-col h-full items-center justify-center text-center animate-fade-in">
            <div className="mb-6">
              <ReadOutlined className="text-[80px] text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-wide mb-2">
              {t("P-ky1VYEPyQhD7eTXso4F")}{" "}
            </h2>
            <p className="text-[15px] text-gray-500">
              {t("PBd_5Zc5MY9mPEijZAXGs")}
            </p>
          </div>
        )}

        {!docData && !loading && (
          <div className="flex h-full items-center justify-center text-gray-400">
            {t("MgTivlPyoyfUHSa0VoYGX")}{" "}
          </div>
        )}

        {docData && !loading && (
          <div className="w-full h-full flex flex-col gap-6 max-w-4xl">
            <div
              id="legal-document-paper"
              ref={paperRef}
              className="flex-1 bg-white shadow-lg rounded-sm p-12 text-gray-800 overflow-y-scroll custom-scrollbar animate-fade-in print:shadow-none"
            >
              <div
                className="
                prose prose-slate max-w-none 
                prose-h1:text-3xl prose-h1:text-center prose-h1:tracking-widest prose-h1:mb-10
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2 prose-h2:text-primary
                prose-h3:text-lg prose-h3:mt-6 prose-h3:text-gray-700
                prose-p:leading-relaxed prose-p:mb-4
                prose-li:my-1
                prose-table:w-full prose-table:my-6 prose-th:bg-gray-50 prose-th:p-3 prose-td:p-3 prose-td:border-b
                prose-strong:text-black prose-strong:font-bold
              "
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {docData.markdownContent}
                </ReactMarkdown>
              </div>
            </div>

            <div className="flex gap-4 m-auto">
              <Button
                type="primary"
                icon={<CopyOutlined />}
                onClick={handleCopy}
              >
                {t("mv6JrcXr2_kqMLT80hI_z")}{" "}
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

export default CaseReviewPage;
