PGDMP     8    5                }           dev_db    14.17 (Homebrew)    14.17 (Homebrew) F    �           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                      false            �           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                      false            �           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                      false            �           1262    16547    dev_db    DATABASE     Q   CREATE DATABASE dev_db WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE = 'C';
    DROP DATABASE dev_db;
                chrisharris    false            D           1247    24878    Preparation    TYPE     �   CREATE TYPE public."Preparation" AS ENUM (
    'raw',
    'mechanical',
    'chemical',
    'burned',
    'grass seed',
    'landscaped'
);
     DROP TYPE public."Preparation";
       public          chrisharris    false            �            1259    24913    Crop    TABLE     �  CREATE TABLE public."Crop" (
    "cropId" uuid DEFAULT gen_random_uuid() NOT NULL,
    "cropName" text NOT NULL,
    "speciesId" uuid,
    "seedInfo" text,
    "cropStock" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted boolean DEFAULT false,
    "projectId" uuid,
    "organizationId" uuid,
    "cropNotes" text,
    "csvobjId" uuid,
    "editedBy" uuid,
    "lastEditedAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);
    DROP TABLE public."Crop";
       public         heap    chrisharris    false            �            1259    24902    Land    TABLE       CREATE TABLE public."Land" (
    "landId" uuid DEFAULT gen_random_uuid() NOT NULL,
    "landName" text NOT NULL,
    "projectId" uuid,
    hectares numeric,
    "landHolder" text,
    "gpsLat" numeric,
    "gpsLon" numeric,
    "landNotes" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "lastEditedAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "editedBy" uuid,
    deleted boolean DEFAULT false,
    preparation public."Preparation",
    "csvobjId" uuid,
    polygon jsonb
);
    DROP TABLE public."Land";
       public         heap    chrisharris    false    836            �            1259    25204    Nursery    TABLE     �  CREATE TABLE public."Nursery" (
    "nurseryId" uuid DEFAULT gen_random_uuid() NOT NULL,
    "gpsLat" double precision NOT NULL,
    "gpsLon" double precision NOT NULL,
    capacity integer NOT NULL,
    "nurseryNotes" text,
    "tradeName" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "createdBy" uuid NOT NULL,
    "lastEditedAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);
    DROP TABLE public."Nursery";
       public         heap    chrisharris    false            �            1259    24946    Organizations    TABLE       CREATE TABLE public."Organizations" (
    "organizationId" uuid DEFAULT gen_random_uuid() NOT NULL,
    "organizationName" text NOT NULL,
    "contactName" text,
    "contactEmail" text,
    address text,
    website text,
    "organizationNotes" text,
    deleted boolean DEFAULT false,
    "gpsLat" double precision,
    "gpsLon" double precision,
    "contactPhone" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "editedBy" uuid,
    "lastEditedAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);
 #   DROP TABLE public."Organizations";
       public         heap    chrisharris    false            �            1259    24924    Planting    TABLE       CREATE TABLE public."Planting" (
    "plantingId" uuid DEFAULT gen_random_uuid() NOT NULL,
    "landId" uuid,
    planted integer,
    "plantingDate" date,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "lastEditedAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted boolean DEFAULT false,
    "cropId" uuid,
    "plantingNotes" text
);
    DROP TABLE public."Planting";
       public         heap    chrisharris    false            �            1259    24891    Projects    TABLE     �  CREATE TABLE public."Projects" (
    "projectId" uuid DEFAULT gen_random_uuid() NOT NULL,
    "projectName" text NOT NULL,
    "projectNotes" text,
    deleted boolean DEFAULT false,
    "csvobjId" uuid,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "editedBy" uuid,
    "lastEditedAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    source text
);
    DROP TABLE public."Projects";
       public         heap    chrisharris    false            �            1259    24958    Species    TABLE     y  CREATE TABLE public."Species" (
    type text,
    family text,
    reference text,
    deleted boolean DEFAULT false,
    "commonName" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "editedBy" uuid,
    "lastEditedAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "scientificName" text,
    "speciesId" uuid NOT NULL
);
    DROP TABLE public."Species";
       public         heap    chrisharris    false            �            1259    24991    StakeholderTypes    TABLE     +  CREATE TABLE public."StakeholderTypes" (
    deleted boolean DEFAULT false,
    "stakeholderType" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "lastEditedAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "stakeholderTypeId" text NOT NULL
);
 &   DROP TABLE public."StakeholderTypes";
       public         heap    chrisharris    false            �            1259    25177    Stakeholders    TABLE     #  CREATE TABLE public."Stakeholders" (
    "stakeholderId" uuid DEFAULT gen_random_uuid() NOT NULL,
    "organizationId" uuid NOT NULL,
    "stakeholderTypeId" text NOT NULL,
    "projectId" uuid NOT NULL,
    "organizationName" text,
    "stakeholderTypeName" text,
    "projectName" text
);
 "   DROP TABLE public."Stakeholders";
       public         heap    chrisharris    false            �            1259    24868    _prisma_migrations    TABLE     �  CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);
 &   DROP TABLE public._prisma_migrations;
       public         heap    chrisharris    false            �            1259    25001    csvobj    TABLE     �   CREATE TABLE public.csvobj (
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    "csvobjId" uuid DEFAULT gen_random_uuid() NOT NULL,
    "jsonData" jsonb NOT NULL
);
    DROP TABLE public.csvobj;
       public         heap    chrisharris    false            �            1259    25010    metadata    TABLE     �   CREATE TABLE public.metadata (
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    "csvKey" text NOT NULL,
    "csvobjId" uuid NOT NULL,
    "dbKey" text NOT NULL,
    "metadataId" uuid DEFAULT gen_random_uuid() NOT NULL
);
    DROP TABLE public.metadata;
       public         heap    chrisharris    false            �          0    24913    Crop 
   TABLE DATA           �   COPY public."Crop" ("cropId", "cropName", "speciesId", "seedInfo", "cropStock", "createdAt", deleted, "projectId", "organizationId", "cropNotes", "csvobjId", "editedBy", "lastEditedAt") FROM stdin;
    public          chrisharris    false    212   c       �          0    24902    Land 
   TABLE DATA           �   COPY public."Land" ("landId", "landName", "projectId", hectares, "landHolder", "gpsLat", "gpsLon", "landNotes", "createdAt", "lastEditedAt", "editedBy", deleted, preparation, "csvobjId", polygon) FROM stdin;
    public          chrisharris    false    211   Od       �          0    25204    Nursery 
   TABLE DATA           �   COPY public."Nursery" ("nurseryId", "gpsLat", "gpsLon", capacity, "nurseryNotes", "tradeName", "createdAt", "createdBy", "lastEditedAt") FROM stdin;
    public          chrisharris    false    220   f       �          0    24946    Organizations 
   TABLE DATA           �   COPY public."Organizations" ("organizationId", "organizationName", "contactName", "contactEmail", address, website, "organizationNotes", deleted, "gpsLat", "gpsLon", "contactPhone", "createdAt", "editedBy", "lastEditedAt") FROM stdin;
    public          chrisharris    false    214   <f       �          0    24924    Planting 
   TABLE DATA           �   COPY public."Planting" ("plantingId", "landId", planted, "plantingDate", "createdAt", "lastEditedAt", deleted, "cropId", "plantingNotes") FROM stdin;
    public          chrisharris    false    213   Yf       �          0    24891    Projects 
   TABLE DATA           �   COPY public."Projects" ("projectId", "projectName", "projectNotes", deleted, "csvobjId", "createdAt", "editedBy", "lastEditedAt", source) FROM stdin;
    public          chrisharris    false    210   �h       �          0    24958    Species 
   TABLE DATA           �   COPY public."Species" (type, family, reference, deleted, "commonName", "createdAt", "editedBy", "lastEditedAt", "scientificName", "speciesId") FROM stdin;
    public          chrisharris    false    215   Ti       �          0    24991    StakeholderTypes 
   TABLE DATA           z   COPY public."StakeholderTypes" (deleted, "stakeholderType", "createdAt", "lastEditedAt", "stakeholderTypeId") FROM stdin;
    public          chrisharris    false    216   qi       �          0    25177    Stakeholders 
   TABLE DATA           �   COPY public."Stakeholders" ("stakeholderId", "organizationId", "stakeholderTypeId", "projectId", "organizationName", "stakeholderTypeName", "projectName") FROM stdin;
    public          chrisharris    false    219   �i       �          0    24868    _prisma_migrations 
   TABLE DATA           �   COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
    public          chrisharris    false    209   �i       �          0    25001    csvobj 
   TABLE DATA           E   COPY public.csvobj ("createdAt", "csvobjId", "jsonData") FROM stdin;
    public          chrisharris    false    217   �m       �          0    25010    metadata 
   TABLE DATA           \   COPY public.metadata ("createdAt", "csvKey", "csvobjId", "dbKey", "metadataId") FROM stdin;
    public          chrisharris    false    218   �m       �           2606    24912    Land Land_pkey 
   CONSTRAINT     V   ALTER TABLE ONLY public."Land"
    ADD CONSTRAINT "Land_pkey" PRIMARY KEY ("landId");
 <   ALTER TABLE ONLY public."Land" DROP CONSTRAINT "Land_pkey";
       public            chrisharris    false    211            �           2606    25213    Nursery Nursery_pkey 
   CONSTRAINT     _   ALTER TABLE ONLY public."Nursery"
    ADD CONSTRAINT "Nursery_pkey" PRIMARY KEY ("nurseryId");
 B   ALTER TABLE ONLY public."Nursery" DROP CONSTRAINT "Nursery_pkey";
       public            chrisharris    false    220            �           2606    24957     Organizations Organizations_pkey 
   CONSTRAINT     p   ALTER TABLE ONLY public."Organizations"
    ADD CONSTRAINT "Organizations_pkey" PRIMARY KEY ("organizationId");
 N   ALTER TABLE ONLY public."Organizations" DROP CONSTRAINT "Organizations_pkey";
       public            chrisharris    false    214            �           2606    24934    Planting Planting_pkey 
   CONSTRAINT     b   ALTER TABLE ONLY public."Planting"
    ADD CONSTRAINT "Planting_pkey" PRIMARY KEY ("plantingId");
 D   ALTER TABLE ONLY public."Planting" DROP CONSTRAINT "Planting_pkey";
       public            chrisharris    false    213            �           2606    24901    Projects Projects_pkey 
   CONSTRAINT     a   ALTER TABLE ONLY public."Projects"
    ADD CONSTRAINT "Projects_pkey" PRIMARY KEY ("projectId");
 D   ALTER TABLE ONLY public."Projects" DROP CONSTRAINT "Projects_pkey";
       public            chrisharris    false    210            �           2606    25124    Species Species_pkey 
   CONSTRAINT     _   ALTER TABLE ONLY public."Species"
    ADD CONSTRAINT "Species_pkey" PRIMARY KEY ("speciesId");
 B   ALTER TABLE ONLY public."Species" DROP CONSTRAINT "Species_pkey";
       public            chrisharris    false    215            �           2606    25176 &   StakeholderTypes StakeholderTypes_pkey 
   CONSTRAINT     y   ALTER TABLE ONLY public."StakeholderTypes"
    ADD CONSTRAINT "StakeholderTypes_pkey" PRIMARY KEY ("stakeholderTypeId");
 T   ALTER TABLE ONLY public."StakeholderTypes" DROP CONSTRAINT "StakeholderTypes_pkey";
       public            chrisharris    false    216            �           2606    25184    Stakeholders Stakeholders_pkey 
   CONSTRAINT     m   ALTER TABLE ONLY public."Stakeholders"
    ADD CONSTRAINT "Stakeholders_pkey" PRIMARY KEY ("stakeholderId");
 L   ALTER TABLE ONLY public."Stakeholders" DROP CONSTRAINT "Stakeholders_pkey";
       public            chrisharris    false    219            �           2606    24923    Crop Trees_pkey 
   CONSTRAINT     W   ALTER TABLE ONLY public."Crop"
    ADD CONSTRAINT "Trees_pkey" PRIMARY KEY ("cropId");
 =   ALTER TABLE ONLY public."Crop" DROP CONSTRAINT "Trees_pkey";
       public            chrisharris    false    212            �           2606    24876 *   _prisma_migrations _prisma_migrations_pkey 
   CONSTRAINT     h   ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);
 T   ALTER TABLE ONLY public._prisma_migrations DROP CONSTRAINT _prisma_migrations_pkey;
       public            chrisharris    false    209            �           2606    25138    csvobj csvobj_pkey 
   CONSTRAINT     X   ALTER TABLE ONLY public.csvobj
    ADD CONSTRAINT csvobj_pkey PRIMARY KEY ("csvobjId");
 <   ALTER TABLE ONLY public.csvobj DROP CONSTRAINT csvobj_pkey;
       public            chrisharris    false    217            �           2606    25148    metadata metadata_pkey 
   CONSTRAINT     ^   ALTER TABLE ONLY public.metadata
    ADD CONSTRAINT metadata_pkey PRIMARY KEY ("metadataId");
 @   ALTER TABLE ONLY public.metadata DROP CONSTRAINT metadata_pkey;
       public            chrisharris    false    218            �           1259    25023    idx_crop_organization_id    INDEX     W   CREATE INDEX idx_crop_organization_id ON public."Crop" USING btree ("organizationId");
 ,   DROP INDEX public.idx_crop_organization_id;
       public            chrisharris    false    212            �           1259    25024    idx_crop_project_id    INDEX     M   CREATE INDEX idx_crop_project_id ON public."Crop" USING btree ("projectId");
 '   DROP INDEX public.idx_crop_project_id;
       public            chrisharris    false    212            �           1259    25020    idx_land_project_id    INDEX     M   CREATE INDEX idx_land_project_id ON public."Land" USING btree ("projectId");
 '   DROP INDEX public.idx_land_project_id;
       public            chrisharris    false    211            �           1259    25185    idx_organizationid    INDEX     Y   CREATE INDEX idx_organizationid ON public."Stakeholders" USING btree ("organizationId");
 &   DROP INDEX public.idx_organizationid;
       public            chrisharris    false    219            �           1259    25026    idx_planting_crop_id    INDEX     O   CREATE INDEX idx_planting_crop_id ON public."Planting" USING btree ("cropId");
 (   DROP INDEX public.idx_planting_crop_id;
       public            chrisharris    false    213            �           1259    25186    idx_projectid    INDEX     O   CREATE INDEX idx_projectid ON public."Stakeholders" USING btree ("projectId");
 !   DROP INDEX public.idx_projectid;
       public            chrisharris    false    219            �           1259    25187    idx_stakeholdertypeid    INDEX     _   CREATE INDEX idx_stakeholdertypeid ON public."Stakeholders" USING btree ("stakeholderTypeId");
 )   DROP INDEX public.idx_stakeholdertypeid;
       public            chrisharris    false    219            �           1259    25127    unique_common_name    INDEX     W   CREATE UNIQUE INDEX unique_common_name ON public."Species" USING btree ("commonName");
 &   DROP INDEX public.unique_common_name;
       public            chrisharris    false    215            �           1259    25022    unique_crop_name    INDEX     P   CREATE UNIQUE INDEX unique_crop_name ON public."Crop" USING btree ("cropName");
 $   DROP INDEX public.unique_crop_name;
       public            chrisharris    false    212            �           1259    25025    unique_crop_name_per_project    INDEX     i   CREATE UNIQUE INDEX unique_crop_name_per_project ON public."Crop" USING btree ("projectId", "cropName");
 0   DROP INDEX public.unique_crop_name_per_project;
       public            chrisharris    false    212    212            �           1259    30642    unique_land_crop    INDEX     \   CREATE UNIQUE INDEX unique_land_crop ON public."Planting" USING btree ("landId", "cropId");
 $   DROP INDEX public.unique_land_crop;
       public            chrisharris    false    213    213            �           1259    25019    unique_land_name    INDEX     P   CREATE UNIQUE INDEX unique_land_name ON public."Land" USING btree ("landName");
 $   DROP INDEX public.unique_land_name;
       public            chrisharris    false    211            �           1259    25021    unique_land_name_per_project    INDEX     i   CREATE UNIQUE INDEX unique_land_name_per_project ON public."Land" USING btree ("projectId", "landName");
 0   DROP INDEX public.unique_land_name_per_project;
       public            chrisharris    false    211    211            �           1259    25188    unique_org_type_project    INDEX     �   CREATE UNIQUE INDEX unique_org_type_project ON public."Stakeholders" USING btree ("organizationId", "stakeholderTypeId", "projectId");
 +   DROP INDEX public.unique_org_type_project;
       public            chrisharris    false    219    219    219            �           1259    25029    unique_organization_name    INDEX     i   CREATE UNIQUE INDEX unique_organization_name ON public."Organizations" USING btree ("organizationName");
 ,   DROP INDEX public.unique_organization_name;
       public            chrisharris    false    214            �           1259    25214    unique_project_name    INDEX     Z   CREATE UNIQUE INDEX unique_project_name ON public."Projects" USING btree ("projectName");
 '   DROP INDEX public.unique_project_name;
       public            chrisharris    false    210            �           2606    25165    Crop Crop_csvobjId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Crop"
    ADD CONSTRAINT "Crop_csvobjId_fkey" FOREIGN KEY ("csvobjId") REFERENCES public.csvobj("csvobjId") ON DELETE SET NULL;
 E   ALTER TABLE ONLY public."Crop" DROP CONSTRAINT "Crop_csvobjId_fkey";
       public          chrisharris    false    3563    212    217            �           2606    25061    Crop Crop_organizationId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Crop"
    ADD CONSTRAINT "Crop_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organizations"("organizationId");
 K   ALTER TABLE ONLY public."Crop" DROP CONSTRAINT "Crop_organizationId_fkey";
       public          chrisharris    false    212    214    3555            �           2606    25066    Crop Crop_projectId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Crop"
    ADD CONSTRAINT "Crop_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Projects"("projectId");
 F   ALTER TABLE ONLY public."Crop" DROP CONSTRAINT "Crop_projectId_fkey";
       public          chrisharris    false    210    3537    212            �           2606    25128    Crop Crop_speciesId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Crop"
    ADD CONSTRAINT "Crop_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES public."Species"("speciesId");
 F   ALTER TABLE ONLY public."Crop" DROP CONSTRAINT "Crop_speciesId_fkey";
       public          chrisharris    false    212    3558    215            �           2606    25160    Land Land_csvobjId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Land"
    ADD CONSTRAINT "Land_csvobjId_fkey" FOREIGN KEY ("csvobjId") REFERENCES public.csvobj("csvobjId") ON DELETE SET NULL;
 E   ALTER TABLE ONLY public."Land" DROP CONSTRAINT "Land_csvobjId_fkey";
       public          chrisharris    false    217    3563    211            �           2606    25051    Land Land_projectId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Land"
    ADD CONSTRAINT "Land_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Projects"("projectId");
 F   ALTER TABLE ONLY public."Land" DROP CONSTRAINT "Land_projectId_fkey";
       public          chrisharris    false    3537    211    210            �           2606    25076    Planting Planting_cropId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Planting"
    ADD CONSTRAINT "Planting_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES public."Crop"("cropId");
 K   ALTER TABLE ONLY public."Planting" DROP CONSTRAINT "Planting_cropId_fkey";
       public          chrisharris    false    212    3545    213            �           2606    25081    Planting Planting_landId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Planting"
    ADD CONSTRAINT "Planting_landId_fkey" FOREIGN KEY ("landId") REFERENCES public."Land"("landId");
 K   ALTER TABLE ONLY public."Planting" DROP CONSTRAINT "Planting_landId_fkey";
       public          chrisharris    false    211    213    3540            �           2606    25155    Projects Projects_csvobjId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Projects"
    ADD CONSTRAINT "Projects_csvobjId_fkey" FOREIGN KEY ("csvobjId") REFERENCES public.csvobj("csvobjId") ON DELETE SET NULL;
 M   ALTER TABLE ONLY public."Projects" DROP CONSTRAINT "Projects_csvobjId_fkey";
       public          chrisharris    false    3563    210    217                        2606    25189 -   Stakeholders Stakeholders_organizationId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Stakeholders"
    ADD CONSTRAINT "Stakeholders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organizations"("organizationId") ON DELETE CASCADE;
 [   ALTER TABLE ONLY public."Stakeholders" DROP CONSTRAINT "Stakeholders_organizationId_fkey";
       public          chrisharris    false    219    214    3555                       2606    25194 (   Stakeholders Stakeholders_projectId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Stakeholders"
    ADD CONSTRAINT "Stakeholders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Projects"("projectId") ON DELETE CASCADE;
 V   ALTER TABLE ONLY public."Stakeholders" DROP CONSTRAINT "Stakeholders_projectId_fkey";
       public          chrisharris    false    219    210    3537                       2606    25199 0   Stakeholders Stakeholders_stakeholderTypeId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Stakeholders"
    ADD CONSTRAINT "Stakeholders_stakeholderTypeId_fkey" FOREIGN KEY ("stakeholderTypeId") REFERENCES public."StakeholderTypes"("stakeholderTypeId") ON DELETE CASCADE;
 ^   ALTER TABLE ONLY public."Stakeholders" DROP CONSTRAINT "Stakeholders_stakeholderTypeId_fkey";
       public          chrisharris    false    3561    219    216            �           2606    25170    metadata metadata_csvobjId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.metadata
    ADD CONSTRAINT "metadata_csvobjId_fkey" FOREIGN KEY ("csvobjId") REFERENCES public.csvobj("csvobjId") ON DELETE CASCADE;
 K   ALTER TABLE ONLY public.metadata DROP CONSTRAINT "metadata_csvobjId_fkey";
       public          chrisharris    false    3563    217    218            �   :  x��лj1��z�y�1��H�q�Ӆ�[7���,Ɛ"o��!7�`A|�9�c!��,9BNɁ&��5zj:���.������#$����-�i���'O�E�@æ��h�u����+��W3jEc��9?�X@�Yh!ۑ[��Y��V�[4㨌�j��K�:��=s��C��	FO�U���Q$)Y�)��G
	����)�J!�t8_�J[��vyM��O�ӂRXg�[��ҵg)�DFb� э�ܨ�*�uX��ea�t�����V3HIY\�lK .Ȑld�I��X?����|�K�?��]�U��7Ƙ���      �   �  x���Ok1���O�/0��H#�챐�V
�梿Đ��M0��Uj������E��{O�֐L��XpVh�!�,�ix���r���T�
�A���,c�]Hyx�:|������>=Bb@�?a��N�Ơ0\���v�`������b1!��y� �RK���7��9vq��N)�e�	�G(�:��TB�ȊVs�<|�lo��~�=��H)�Ҝ3`�Y�@��_��Ĺ ����J��AN�ͬO����z}8F�w����%t�w>Z���2�69��@���ĭ��,�F�K�?��C�����،��3��܍>g�	�R�n��bC��f��5F��;�ovs>�adb�XG�/z�9���K@��U�fp�)�/\P<*9�3S��R?�d��Is7M2�J���jF$g��R*���k����n�e7n���Z�~2Eg�      �      x������ � �      �      x������ � �      �   ^  x���͑1��=Q8� �#�	)�L{O��)om��P5�=H�i����S!&N�e�ە� �9�Gc6sh:w3�׏����:`�6������:��*�k�-ۀgU�3����-n����!���N= �Z ��T�c/O�l�{Ƞ�$Am�2W[<^�֐�x?J��V>A�K7��Ĺ�F8�Aٷ$�ndm��X�A0�IMۘ/$�z@"*�R�����#�:�_���s��)���n�ΡS�N���y�9�~�2�JC!����B�'�J��2��u���ríF�B1К�U4%9.���)a�]�`R
�K�7���<t��H�o��J�jE��mޑs<^>g�r�F�\�խ7�8c�4����u�b9��*RH��zD�P�#{�t��9o������������G\�eӮ�"ɹn^�L]9��T�\��@j���������>x�����V��P Z�]�j�M���R�0���]���*�E����}[}�BȊ:�{�[zȜiXw���}��I��k����Ē����s�n�r�b��ʵmQ�c�S�iYp���/u���������G�������x�!�n7      �   }   x���;�0k���F��fqn@�((Ӭ?H��c%��:�W���D.qd(X8KQ�{��%�8&u[�m�Y�nΏ���!$��Շ�l�U�O)��5�^���j���� �.��>@�k�4h�_b�-      �      x������ � �      �      x������ � �      �      x������ � �      �   �  x��U[n[7��W����Etr8l�@��}G��Ʃ�B�����yЅ|�I;���4�M4��M��2��y�LI{O��h�܌�ϝ�0(��\}le=��t	\�p����C�{�n���*p�~h��y�m�/�����|�˧���7O`b����6;+���F��7���\�@
kYI�,#�ԃN_]�bn�QY8��I[�Ɛwh� ���8���׿�>?��G���!�jr`6��4�����.Ft:�d��j�Dw������v�4�d�P)h9X&q�	���	 ^��!pr����]����#m*���\��.ѕ���,��!�2����/��k@w�� bI6H�A�j�r�����EW�^���=�\�|��w�q�ͽ����ҩ�ˡ��\~�L�i)Џ�����Å{q�J�����FQ6Q��@��1�p��%N	ж�֨O̶Bfe�J%Q�2S�2�h��<�k�ǪM#�g?�1�wᕲF�h�q&�w@� }�{'��L7�}`� 4�2I@e6k�lSzn�[���<9��cƘ3�Ըf�^���w%�I�5#�a¯fމ�GF/����1�X�▬�(M���H�e�m�.�{
o�Dl�]	십|s�S1�Z]�8�ǂ�5���Oa�c��㨸�ȍ��)�����)??�����xk˪o����<����}to0XIa�R�T8{�I�
J5N�l�h��*\�kHYk��_]�*�s�k��0�����e�k*4,7Χ����S�ܭ0{T�!��Ε .m*�"c,�)�
(xn�t�NH��gץ`ҧby%K��ƥ��Qw��t�d���k����Y_s��~�@o���u�Kx��h�25�V�b��{b�� XJD�}9�җǬ�V�:���̵+I�0b�����]kK�������5~3��n�o�tww�7B�      �      x������ � �      �      x������ � �     